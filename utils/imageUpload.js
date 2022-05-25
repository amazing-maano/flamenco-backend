const fs = require('fs');
const aws = require('aws-sdk');
const randomstring = require('randomstring');

const {
  access_Key_Id, secret_Access_Key, region, s3_bucket,
} = require('../config/environment');

exports.uploadImage = async (s3FolderName, userId, file) => {
  let imageUrl;
  try {
    const key = `${s3FolderName}/${userId}-${randomstring.generate(10)}-${file.originalname}`;

    aws.config.setPromisesDependency();
    aws.config.update({
      accessKeyId: access_Key_Id,
      secretAccessKey: secret_Access_Key,
      region,
    });
    const s3 = new aws.S3();

    const params = {
      Bucket: s3_bucket,
      Body: fs.createReadStream(file.path),
      Key: key,
    };

    const data = await s3.upload(params).promise();
    imageUrl = data.Location;
  } catch (err) {
    console.log('Error occured while trying to upload to S3 bucket', err);
  } finally {
    fs.unlinkSync(file.path);
  }
  return imageUrl;
};
