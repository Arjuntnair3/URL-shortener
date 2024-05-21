const mongoose = require('mongoose');
const shortid = require('shortid');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;


const shortUrlSchema = new Schema({
    title: {
      type: String,
      required: true
    },
    full: {
      type: String,
      required: true
    },
    short: {
      type: String,
      required: true,
      default: shortid.generate
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
});

shortUrlSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('ShortURL', shortUrlSchema);
