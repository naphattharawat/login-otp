import * as express from 'express';
import { Router, Request, Response } from 'express';
import { Jwt } from '../models/jwt';
import { OtpModel } from '../models/otp';
import * as moment from 'moment';
import * as HttpStatus from 'http-status-codes';
const uuidv4 = require('uuid/v4');

const jwt = new Jwt();

const router: Router = Router();
const otpModel = new OtpModel();

router.get('/', (req: Request, res: Response) => {
  res.send({ ok: true, message: 'Welcome to OTP api login!', code: HttpStatus.OK });
});

router.post('/', async (req: Request, res: Response) => {
  const tel = req.body.tel;
  const db = req.db;
  const appId = req.body.appId;
  var rndString = randomString(6).toUpperCase();

  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        const rs: any = await otpModel.getUser(db, tel);
        if (rs.length) {
          // check before send otp
          var currentDate = moment().format('x');
          let otp = randomNumber();
          var otpMessage = `รหัส OTP ของคุณคือ ${otp} , รหัสมีอายุ 5 นาที`;
          let rsOtp = await otpModel.sendOtp(+tel, otpMessage);

          let sTel = `${tel.substr(0, 2)}XXXXX${tel.substr(-3)}`;

          let createdAt = moment().format('x');
          let expiredAt = moment().add(15, 'minute').format('x');

          // save otp data
          var id = uuidv4();
          await otpModel.saveOtp(req.db, id, otp, rndString, tel, createdAt, expiredAt, 'activated');
          res.send({ ok: true, ref_code: rndString, phone_number: sTel });
        } else {
          res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
        }
      } else {
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }

});

router.post('/register', async (req: Request, res: Response) => {
  const tel = req.body.tel;
  const db = req.db;
  const appId = req.body.appId;
  var rndString = randomString(6).toUpperCase();

  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        // check before send otp
        var currentDate = moment().format('x');
        let otp = randomNumber();
        var otpMessage = `รหัส OTP ของคุณคือ ${otp} , ref:${rndString}, รหัสมีอายุ 5 นาที`;
        let rsOtp = await otpModel.sendOtp(+tel, otpMessage, 'Co-ward OTP');
        let sTel = `${tel.substr(0, 2)}XXXXX${tel.substr(-3)}`;

        let createdAt = moment().format('x');
        let expiredAt = moment().add(15, 'minute').format('x');

        // save otp data
        var id = uuidv4();
        await otpModel.saveOtp(req.db, id, otp, rndString, tel, createdAt, expiredAt, 'activated');
        res.send({ ok: true, ref_code: rndString, phone_number: sTel });
      } else {
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }

});

router.post('/verify', async (req: Request, res: Response) => {
  const refCode = req.body.refCode;
  const otp = req.body.otp;

  try {
    if (otp && refCode) {
      var rs: any = await otpModel.getVerifyOtp(req.db, otp, refCode);
      if (rs.length) {
        var currentTime = moment().format('x');
        if (rs[0].expired_at < currentTime) {
          res.send({ ok: false, error: 'รหัส OTP หมดอายุ' });
        } else {
          // update inuse
          await otpModel.updateInUseOtp(req.db, otp);
          res.send({ ok: true });
        }
      }
      else {
        res.send({ ok: false, error: 'รหัส OTP ไม่ถูกต้อง' });
      }
    }
    else {
      res.send({ ok: false, error: 'ไม่พบรหัส OTP และ รหัสอ้างอิง' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/ais', async (req: Request, res: Response) => {
  const db = req.db;
  const tel = req.body.tel;
  const appId = req.body.appId;
  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        const token: any = await otpModel.getTokenAIS();
        if (JSON.parse(token).resultCode == 20000) {
          const _token = JSON.parse(token).accessToken;
          const templateCode: any = key[0].template_code;
          const rs: any = await otpModel.getUser(db, tel);
          if (rs.length) {
            // check before send otp
            const _tel = `66${+tel}`;
            let rsOtp: any = await otpModel.sendOtpAIS(_token, _tel, templateCode);
            const _rsOtp = JSON.parse(rsOtp);
            console.log('rsOtp', _rsOtp);
            res.send({ ok: true, ref_code: _rsOtp.referenceNumber, transactionID: _rsOtp.transactionID, phone_number: tel });
          } else {
            res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
          }
        } else {
          res.send({ ok: false, error: 'Token ไม่ถูกต้อง' });
        }
      } else {
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }

});

router.post('/ais/verify', async (req: Request, res: Response) => {
  const db = req.db;
  const tel = req.body.tel;
  const otp = req.body.otp;
  const transactionID = req.body.transactionID;
  const appId = req.body.appId;
  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        const token: any = await otpModel.getTokenAIS();
        if (JSON.parse(token).resultCode == 20000) {
          const _token = JSON.parse(token).accessToken;
          const templateCode: any = key[0].template_code;
          const _tel = `66${+tel}`;
          console.log(_token, _tel, templateCode, otp, transactionID);

          let rsOtp: any = await otpModel.verifyOtpAIS(_token, _tel, templateCode, otp, transactionID);
          const _rsOtp = JSON.parse(rsOtp);
          console.log('rsOtp', _rsOtp);
          if (_rsOtp.resultCode == 20000) {
            await otpModel.saveLog(db,appId,tel,'{error:"Success"}');
            res.send({ ok: true, message: 'Success' });
          } else {
            await otpModel.saveLog(db,appId,tel,'{error:"OTP ไม่ถูกต้อง"}');
            res.send({ ok: false, error: 'OTP ไม่ถูกต้อง' });
          }
        } else {
          await otpModel.saveLog(db,appId,tel,'{error:"Token ไม่ถูกต้อง"}');
          res.send({ ok: false, error: 'Token ไม่ถูกต้อง' });
        }
      } else {
        await otpModel.saveLog(db,appId,tel,'{error:"App ID ไม่ถูกต้อง"}');
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      await otpModel.saveLog(db,appId,tel,'{error:"ไม่พบ OTP"}');
      res.send({ ok: false, error: 'ไม่พบ OTP' });
    }
  } catch (error) {
    await otpModel.saveLog(db,appId,tel,JSON.stringify(error));
    res.send({ ok: false, error: error.message });
  }

});

// ไม่เช็ค users
router.post('/ais/otp', async (req: Request, res: Response) => {
  const db = req.db;
  const tel = req.body.tel;
  const appId = req.body.appId;
  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        const token: any = await otpModel.getTokenAIS();
        if (JSON.parse(token).resultCode == 20000) {
          const _token = JSON.parse(token).accessToken;
          const templateCode: any = key[0].template_code;
          // check before send otp
          const _tel = `66${+tel}`;
          let rsOtp: any = await otpModel.sendOtpAIS(_token, _tel, templateCode);
          const _rsOtp = JSON.parse(rsOtp);
          await otpModel.saveLog(db,appId,tel,_rsOtp);
          res.send({ ok: true, ref_code: _rsOtp.referenceNumber, transactionID: _rsOtp.transactionID, phone_number: tel });

        } else {
          await otpModel.saveLog(db,appId,tel,'{error:"Token ไม่ถูกต้อง"}');
          res.send({ ok: false, error: 'Token ไม่ถูกต้อง' });
        }
      } else {
        await otpModel.saveLog(db,appId,tel,'{error:"App ID ไม่ถูกต้อง"}');
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      await otpModel.saveLog(db,appId,tel,'{error:"ไม่พบเบอร์โทรศัพท์"}');
      res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
    }
  } catch (error) {
    await otpModel.saveLog(db,appId,tel,JSON.stringify(error));
    res.send({ ok: false, error: error.message });
  }

});

router.post('/ais/sms', async (req: Request, res: Response) => {
  const db = req.db;
  const tel = req.body.tel;
  const appId = req.body.appId;
  const text = req.body.text;
  try {
    if (tel) {
      const key: any = await otpModel.getAppId(db, appId);
      if (key.length) {
        const token: any = await otpModel.getTokenAIS();
        if (JSON.parse(token).resultCode == 20000) {
          const _token = JSON.parse(token).accessToken;
          const code: any = key[0].template_code;
          const sender: any = key[0].app_name;
          // check before send otp
          const _tel = `66${+tel}`;

          let rsOtp: any = await otpModel.sendSMS(_token, _tel, sender, code, text);
          const _rsOtp = JSON.parse(rsOtp);
          console.log(_rsOtp);
          res.send({ ok: true, smid: _rsOtp.SMID, phone_number: tel });

        } else {
          await otpModel.saveLog(db,appId,tel,'{error:"Token ไม่ถูกต้อง"}');
          res.send({ ok: false, error: 'Token ไม่ถูกต้อง' });
        }
      } else {
        await otpModel.saveLog(db,appId,tel,'{error:"App ID ไม่ถูกต้อง"}');
        res.send({ ok: false, error: 'App ID ไม่ถูกต้อง' });
      }

    } else {
      await otpModel.saveLog(db,appId,tel,'{error:"ไม่พบเบอร์โทรศัพท์"}');
      res.send({ ok: false, error: 'ไม่พบเบอร์โทรศัพท์' });
    }
  } catch (error) {
    await otpModel.saveLog(db,appId,tel,JSON.stringify(error));
    res.send({ ok: false, error: error.message });
  }

});

function randomString(digitLength: number) {
  var _digitLength = digitLength || 10;
  var strRandom = '';
  var random = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < _digitLength; i++) { strRandom += random.charAt(Math.floor(Math.random() * random.length)); }
  return strRandom;
}

function randomNumber() {
  var strRandom = '';
  var random = '0123456789';
  for (var i = 0; i < 6; i++) { strRandom += random.charAt(Math.floor(Math.random() * random.length)); }
  return strRandom;
}
export default router;