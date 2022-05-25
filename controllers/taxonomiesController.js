const ClassTaxonomies = require('../models/classTaxonomiesModel');
const { ERROR_TYPES } = require('../config/errorTypes');
// const { i18next } = require('../i18n/index');

const {
  TOKEN_VERIFIED, DATA_MISSING,
} = ERROR_TYPES;

module.exports = {
  createTaxonomy: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      } else {
        const newTaxonomy = new ClassTaxonomies(data);
        newTaxonomy.save().then((result) => res.status(200).json({ result }))
          .catch((err) => {
            res.status(500).json({
              error: err.message,
            });
          });
        console.log(newTaxonomy);
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  updateTaxonomies: async (req, res) => {
    try {
      const { tagName } = req.body;
      // console.log(tagName);
      if (Object.getOwnPropertyNames(req.body).length === 0) {
        res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      const result = await ClassTaxonomies.findOneAndUpdate(
        { 'sub._id': req.params.id },
        { $push: { 'sub.$.tags': { tagName } } }, { new: true },
      );

      return res.status(200).json({ result });
    } catch (err) {
      console.log(err);
      return res.status(500).send(err.message);
    }
  },
  getAllTaxonomies: async (req, res) => {
    try {
      /*
      if (req.headers.origin === 'https://flamenco.netlify.app' || req.headers.origin === 'https://flamencosonline.com') {
        data.forEach((i) => {
          const val = i.profession;
          i18next.init((err, t) => {
            i.profession = t(val);
          });
          i.sub.forEach((j) => {
            const val_sub = j.subject;
            i18next.init((err, t) => {
              j.subject = t(val_sub);
            });
            j.topics.forEach((k) => {
              const val_topic = k.topicName;
              i18next.init((err, t) => {
                k.topicName = t(val_topic);
              });
            });
            j.tags.forEach((l) => {
              const val_tag = l.tagName;
              i18next.init((err, t) => {
                l.tagName = t(val_tag);
              });
            });
          });
        });

        return res.status(200).send({
          msg: TOKEN_VERIFIED,
          data,
        });
      }
*/
      const data = await ClassTaxonomies.find({ });
      return res.status(200).send({
        msg: TOKEN_VERIFIED,
        data,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
  getAllProfessions: async (req, res) => {
    try {
      ClassTaxonomies.find({ }).select('profession').then((data) => res.status(200).send({
        msg: TOKEN_VERIFIED,
        data,
      }))
        .catch((err) => {
          res.status(500).json({
            error: err.message,
          });
        });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  getAllSubjectsByProfession: async (req, res) => {
    try {
      ClassTaxonomies.find({ profession: req.body.profession }).select('subject').then((data) => res.status(200).send({
        msg: TOKEN_VERIFIED,
        data,
      }))
        .catch((err) => {
          res.status(500).json({
            error: err.message,
          });
        });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  getAllTopicsBySubjects: async (req, res) => {
    try {
      ClassTaxonomies.find().select(['topics', 'tags', 'subject']).then((data) => res.status(200).send({
        msg: TOKEN_VERIFIED,
        data,
      }))
        .catch((err) => {
          res.status(500).json({
            error: err.message,
          });
        });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
};
