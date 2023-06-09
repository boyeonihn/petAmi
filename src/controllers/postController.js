import { User } from '../models/User';
import { Post } from '../models/Post';
import { PostComment } from '../models/PostComment';

export const getPost = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id)
    .populate('owner')
    .populate({
      path: 'comments',
      populate: {
        path: 'owner',
        model: 'User',
      },
    });

  if (!post) {
    return res.render('404', { pageTitle: 'Post Not Found' });
  }
  return res.render('posts/read', { pageTitle: `Post: ${post.title}`, post });
};
export const getCreate = (req, res) => {
  return res.render('posts/create', { pageTitle: 'Create a post' });
};

export const postCreate = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    body: { title, topic, text },
    file,
  } = req;

  const user = await User.findById(_id);
  const topicChosen = topic.toLowerCase();

  let post;

  if (topicChosen === 'pet-sitting') {
    const { petsittingDateStart, petsittingDateEnd, location } = req.body;
    try {
      post = await Post.create({
        title,
        topic,
        text,
        date: petsittingDateStart,
        endDate: petsittingDateEnd,
        location,
        owner: _id,
        fileUrl: file ? file.location : '',
      });
    } catch (error) {
      console.error(error);
    }
  } else if (topicChosen === 'packwalk' || topicChosen === 'playdate') {
    const { playwalkDate, playwalkTime, location } = req.body;

    try {
      post = await Post.create({
        title,
        topic,
        text,
        time: playwalkTime,
        date: playwalkDate,
        location,
        owner: _id,
        fileUrl: file ? file.location : '',
      });
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      post = await Post.create({
        title,
        topic,
        text,
        owner: _id,
        fileUrl: file ? file.location : '',
      });
    } catch (err) {
      console.error(err);
    }
  }

  user.posts.push(post._id);
  user.save();
  return res.redirect('/');
};

export const getEdit = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);

  if (!post) {
    return res.sendStatus(404);
  }
  return res.render('posts/edit', { pageTitle: 'Edit Post', post });
};

export const postEdit = async (req, res) => {
  const {
    body: { title, text },
    session: {
      user: { _id },
    },
    params: { id },
  } = req;

  const post = await Post.findById(id);

  if (!post) {
    return res.render('404', { pageTitle: 'Post Not Found' });
  }
  if (String(post.owner._id) !== String(_id)) {
    req.flash('error', 'Not authorized to edit');
    return res.status(403).redirect('/');
  }

  const topicChosen = post.topic.toLowerCase();
  if (topicChosen === 'pet-sitting') {
    const { petsittingDateStart, petsittingDateEnd, location } = req.body;
    try {
      await Post.findByIdAndUpdate(id, {
        title,
        text,
        date: petsittingDateStart,
        endDate: petsittingDateEnd,
        location,
      });
      req.flash('info', 'Post updated');
      return res.redirect(`/posts/${id}`);
    } catch (err) {
      console.error(err);
    }
  } else if (topicChosen === 'packwalk' || topicChosen === 'playdate') {
    const { playwalkDate, playwalkTime, location } = req.body;

    try {
      await Post.findByIdAndUpdate(id, {
        title,
        text,
        date: playwalkDate,
        time: playwalkTime,
        location,
      });
      req.flash('info', 'Post updated');
      return res.redirect(`/posts/${id}`);
    } catch (err) {
      console.error(err);
    }
  } else {
    try {
      await Post.findByIdAndUpdate(id, {
        title,
        text,
      });
      req.flash('info', 'Post updated');
      return res.redirect(`/posts/${id}`);
    } catch (err) {
      console.error(err);
    }
  }
};

export const registerPostView = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);

  if (!post) {
    return res.sendStatus(404);
  }
  post.meta.views += 1;
  await post.save();
  return res.sendStatus(200);
};

export const createPostComment = async (req, res) => {
  const {
    body: { text },
    session: {
      user: { _id },
    },
    params: { id },
  } = req;

  try {
    const post = await Post.findById(id);
    const user = await User.findById(_id);

    if (!post) {
      return res.sendStatus(404);
    }

    const newComment = await PostComment.create({
      text,
      owner: _id,
      post: id,
    });

    post.comments.push(newComment._id);
    post.save();
    user.postComments.push(newComment._id);
    user.save();

    return res.status(201).json({ newCommentId: newComment._id });
  } catch (error) {
    const errorMsg = error._message;
    return res.status(400).render('posts/read', {
      pageTitle: `Read`,
      error: errorMsg,
    });
  }
};

export const deletePostComment = async (req, res) => {
  const {
    body: { id },
    session: {
      user: { _id: userId },
    },
    params: { id: postId },
  } = req;

  const post = await Post.findById(postId);
  if (!post) {
    return res.sendStatus(404);
  }
  post.comments = post.comments.filter((comment) => comment !== id);
  post.save();
  await PostComment.findByIdAndDelete(id);
  return res.sendStatus(200);
};

export const getTag = async (req, res) => {
  const id = req.params.id.toLowerCase();

  const regexPattern = /^[A-Za-z-]+$/;
  if (regexPattern.test(id)) {
    // Handle the request for valid IDs

    const posts = await Post.find({ topic: id })
      .sort({ createdAt: 'desc' })
      .populate('owner');
    return res.render('posts/tag', {
      pageTitle: `Posts under ${id} tag`,
      posts,
      id,
    });
  } else {
    // Handle the request for invalid IDs
    res.status(400).send('Invalid ID format');
  }
};

export const getDelete = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  const {
    user: { _id },
  } = req.session;

  if (!post) {
    return res.status(404).render('404', { pageTitle: 'Post Not Found' });
  }
  if (String(post.owner._id) !== String(_id)) {
    req.flash('error', 'Not authorized to delete');
    return res.status(403).redirect('/');
  }
  await Post.findByIdAndDelete(id);
  req.flash('info', 'Post deletion successful');
  return res.redirect('/');
};
