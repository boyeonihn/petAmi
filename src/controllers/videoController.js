import { Video } from '../models/Video';
export const home = async (req, res) => {
  const videos = await Video.find({});
  return res.render('home', { pageTitle: 'Home', videos });
};

export const watch = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (video) {
    return res.render('watch', { pageTitle: video.title, video });
  }

  return res.render('404', { pageTitle: 'Video Not Found' });
};
export const getEdit = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.render('404', { pageTitle: 'Video Not Found' });
  }
  return res.render('edit', { pageTitle: `Edit ${video.title}`, video });
};

export const postEdit = async (req, res) => {
  const { id } = req.params;
  const { title, description, hashtags } = req.body;
  const video = await Video.exists({ _id: id });
  if (!video) {
    return res.render('404', { pageTitle: 'Video Not Found' });
  }

  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });

  return res.redirect(`/videos/${id}`);
};

export const search = (req, res) => res.send('Search video');
export const remove = (req, res) => res.send('Remove delete');
export const getUpload = (req, res) =>
  res.render('upload', { pageTitle: `Uploading Video` });
export const postUpload = async (req, res) => {
  const { title, description, hashtags } = req.body;
  try {
    //can do new Video() or Video.create()
    await Video.create({
      title,
      description,
      hashtags: hashtags.split(',').map((n) => `#${n.trim()}`),
    });
    // const video = new Video({
    //   title,
    //   description,
    //   createdAt: Date.now(),
    //   hashtags: hashtags.split(',').map((n) => `#${n.trim()}`),
    //   meta: {
    //     views: 0,
    //     rating: 0,
    //   },
    // });
    //  const dbVideo = await video.save();
    return res.redirect(`/`);
  } catch (error) {
    const errorMsg = error._message;
    return res.render('upload', {
      pageTitle: `Uploading Video`,
      error: errorMsg,
    });
  }
};

export const search = async (req, res) => {
  const { keyword } = req.query;

  if (keyword) {
    const videos = await Video.find({
      title: {
        $regex: new RegExp(keyword, 'i'),
      },
    });
    console.log(videos);
    return res.render('search', { pageTitle: 'Search Results', videos });
  }

  return res.render('search', { pageTitle: 'Search' });
};
