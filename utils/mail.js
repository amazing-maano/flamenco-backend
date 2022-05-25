const sgMail = require('@sendgrid/mail');
/*
exports.sendMail = (inputs) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log(inputs);
  console.log('process.env.SENDGRID_API_KEY', process.env.SENDGRID_API_KEY);
  sgMail
    .send(inputs)
    .then((data) => {
      console.log('Email sent', data);
      return data;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};
*/
exports.sendMail = (inputs) => {
  // console.log(process.env.SENDGRID_API_KEY);
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgMail.send(inputs, (err, info) => {
    if (err) {
      console.log(err);
      return err;
    }
    return info;
  });
};
