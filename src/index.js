const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const nodemailer = require('nodemailer');

const {
  MONGODB_URL,
  EMAIL_RECIPIENTS,
  EMAIL_USER,
  EMAIL_PASS
} = process.env;

const baseURL = 'http://www.naic.org/';

function getItems() {
  return [
    { name: 'Header', page: "header.htm" },
    { name: 'Content', page: "cmte_e_va_issues_wg.htm" },
    { name: 'Footer', page: "footer.htm" }
  ];
}

async function sendEmail(updatedValues) {
  const transporter = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  let text = 'NAIC site updated. Changed pages:\n\n' +
    updatedValues.map(({name}) => `- ${name}`).join('\n') +
    `\n\n${baseURL}cmte_e_va_issues_wg.htm`;

  console.log('\n================\nSENDING EMAILS');

  const emailOptions = {
    from: 'Nam <ntgn81@gmail.com>',
    subject: 'NAIC Changedz z z',
    to: EMAIL_RECIPIENTS,
    text
  };

  await transporter.sendMail(emailOptions);
}

async function exec() {
  const axiosInstance = axios.create({baseURL});

  const conn = await MongoClient.connect(MONGODB_URL)
  const dbCol = await conn.collection('naic-last-updated');

  const items = getItems();
  const updatedItems = [];

  for (const item of items) {
    const response = await axiosInstance.get(item.page);
    if (response.headers['last-modified']) {
      item.lastModified = response.headers['last-modified'];
      item.data = response.data;
    }
  }

  for (const item of items) {
    const { page, lastModified } = item;

    if (!lastModified) continue;

    const dbEntry = await dbCol.findOne({
      page,
      lastModified
    });

    if (!dbEntry) {
      updatedItems.push(item);
    }
  }

  if (updatedItems.length) {
    await sendEmail(updatedItems);

    await dbCol.insert(updatedItems.map(({page, lastModified, data}) => ({ page, lastModified, data })));
  } else {
    console.log('\n================\nNO CHANGES');
  }

  await conn.close();
}

exec()
  .then(() => {
    console.log('DONE');
  })
  .catch((e) => {
    console.log('FAILED', e);
  });
