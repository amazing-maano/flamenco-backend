const mongoose = require('mongoose');

const { Schema } = mongoose;

const classTaxonomiesSchema = new Schema({
  profession: String,
  professionESP: String,
  sub: [{
    subject: String,
    subjectESP: String,
    topics: [{
      topicName: String,
      topicNameESP: String,
    }],
    tags: [{
      tagName: String,
      tagNameESP: String,
    }],
  }],
});

classTaxonomiesSchema.index({ '$**': 'text' });

classTaxonomiesSchema.statics = {
  searchPartial(q, callback) {
    return this.find({
      $or: [
        { 'sub.subject': new RegExp(q, 'gi') },
        { 'sub.subject.topicName': new RegExp(q, 'gi') },
        { 'sub.subject.tagName': new RegExp(q, 'gi') },
      ],
    }, callback);
  },

  searchFull(q, callback) {
    return this.find({
      $text: { $search: q, $caseSensitive: false },
    }, callback);
  },

  search(q, callback) {
    // eslint-disable-next-line consistent-return
    this.searchFull(q, (err, data) => {
      if (err) return callback(err, data);
      if (!err && data.length) return callback(err, data);
      if (!err && data.length === 0) return this.searchPartial(q, callback);
    });
  },
};

module.exports = mongoose.model('ClassTaxonomies', classTaxonomiesSchema);
