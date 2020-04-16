import * as Knex from 'knex';
const request = require("request");
export class OtpModel {



  sendOtp(tel: any, mess: any, providerName = process.env.SMS_PROVIDER_NAME) {
    var username = process.env.SMS_USERNAME;
    var password = process.env.SMS_PASSWORD;
    // var providerName = process.env.SMS_PROVIDER_NAME;

    return new Promise((resolve: any, reject: any) => {
      var options = {
        method: 'POST',
        url: 'http://smsgw.cat3g.com/service/SMSWebServiceEngine.php',
        headers:
          { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0" encoding="UTF-8" ?>\n<Envelope>\n\t<Header/>\n\t<Body>\n\t\t<sendSMS>\n\t\t\t<user>${username}</user>\n\t\t\t<pass>${password}</pass>\n\t\t\t<from>${providerName}</from>\n\t\t\t<target>${tel}</target>\n\t\t\t<mess>${mess}</mess>\n\t\t\t<lang>T</lang>\n\t\t</sendSMS>\n\t</Body>\n</Envelope>`
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }


  checkBeforSend(db: Knex, uid: string, currentDate: string) {
    return db('otps')
      .where('in_use', 'N')
      .where('uid', uid)
      .where('expired_at', '>', currentDate);
  }

  getAppId(db: Knex, appId) {
    return db('app_ids')
      .where('app_id', appId)
  }


  saveOtp(db: Knex, id: string, otp: string, refCode: string, tel: string, createdAt: string, expiredAt: string, action: string) {
    return db('otps')
      .insert({
        id: id,
        otp: otp,
        ref_code: refCode,
        phone_number: tel,
        action: action,
        created_at: createdAt,
        expired_at: expiredAt
      });
  }

  getVerifyOtp(db: Knex, otp: string, refCode: string) {
    return db('otps')
      .where('in_use', 'N')
      .where('otp', otp)
      .where('ref_code', refCode);
  }

  updateInUseOtp(db: Knex, otp: string) {
    return db('otps').where('otp', otp).update({ in_use: 'Y' });
  }

  getUser(db: Knex, tel) {
    return db('users')
      .where('username', tel)
  }

  getTokenAIS() {
    var clientId = process.env.OTP_CLIENT_ID;
    var clientSecret = process.env.OTP_CLIENT_SECRET;
    var code = process.env.OTP_CODE;

    return new Promise((resolve: any, reject: any) => {
      var options = {
        method: 'GET',
        url: `https://apisgl.ais.co.th/auth/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=jwt_bearer&code=${code}`,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  sendOtpAIS(token, tel, template) {
    return new Promise((resolve: any, reject: any) => {
      var options = {
        method: 'POST',
        url: 'https://apisgl.ais.co.th/api/v3/gsso/otp/send',
        headers:
        {
          'Content-Type': 'application/json',
          'X-Tid': 'WR20200401221756168',
          'X-Requester': 'LOGIN',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ "msisdn": tel, "service": template })
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  verifyOtpAIS(token, tel, template, otp, transactionID) {
    return new Promise((resolve: any, reject: any) => {
      var options = {
        method: 'POST',
        url: 'https://apisgl.ais.co.th/api/v3/gsso/otp/confirm',
        headers:
        {
          'Content-Type': 'application/json',
          'X-Tid': 'WR20200401221756168',
          'X-Requester': 'LOGIN',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ "msisdn": tel, "service": template, "pwd": otp, "transactionID": transactionID })
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

}