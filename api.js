const MASTER_SPREAD_SHEET_ID = getEnv("MASTER_SPREAD_SHEET_ID");
const LOG_FILE_ID = "1MTtf7Z6pnP_Bq3lTXBnd4HbYDTx9LE5prPUYoXYxrFE";
const logMaxRow = 101;
const spreadSheet_log = SpreadsheetApp.openById(MASTER_SPREAD_SHEET_ID);
const spreadSheet_master = SpreadsheetApp.openById(MASTER_SPREAD_SHEET_ID);
const sheet_log = spreadSheet_log.getSheetByName("log");
//debug setting
let isDebugClear = false;
let logStartTime = 0;
///////////////////////////
/////////utils/////////////
///////////////////////////
async function test() {
  //test post
  // const result = await onPost({
  //   item: {
  //     createAt: "2020-05-01",
  //     deleteAt: null,
  //     updateAt: null,
  //     title: "支出サンプル",
  //     category: "食費",
  //     tags: "タグ1,タグ2",
  //     income: null,
  //     outgo: 3000,
  //     memo: "メモメモ1",
  //   },
  //   options: {
  //     isIncrement: true,
  //     isUUID: true,
  //   },
  // });

  //test get
  // const result = onGet({ sheetName: "2020-05" });

  //test delete
  const result = await onDelete({
    sheetName: "2020-05",
    uuid: "96442047-8bd4-40c1-be10-e50d6656e296",
  });

  //test put
  // const result = onPut({
  //   sheetName_before: "2020-06",
  //   item: {
  //     _ID: 2,
  //     createAt: "2020-06-01",
  //     deleteAt: null,
  //     updateAt: null,
  //     title: "update",
  //     category: "食費",
  //     tags: "タグ1,タグ2",
  //     income: null,
  //     outgo: 3000,
  //     memo: "メモメモ1",
  //   },
  // });

  debug("result", result);
}
//private key
function getEnv(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
function setEnv(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, val);
}

function formatDate(date, timeZone, format) {
  //日本時間の場合は、formatDate(date, 'JST');
  if (date === "") {
    return "";
  } else {
    if (!format) var format = "yyyy/MM/dd HH:mm";
    var retval = Utilities.formatDate(date, timeZone, format);
    // Logger.log(date + "->" + retval + "(" + timeZone + ")");
    return retval;
  }
}

///////////////////////////
///////////////////////////
///////////////////////////
class BaseClassWrapper {
  constructor() {}

  _cp(object, existingObjects) {
    const typeOf = (obj) =>
      Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    if (!existingObjects) existingObjects = [];
    else if (existingObjects.indexOf(object) !== -1)
      throw new Error("Recursive reference exists.");
    else existingObjects = [...existingObjects, object];
    if (Array.isArray(object))
      // [], new Array
      return object.map((value) => this._cp(value, existingObjects));
    if (typeof object === "object")
      switch (typeOf(object)) {
        default: // new Foo etc...
        case "object": {
          // {}, new Object
          const symbols = Object.getOwnPropertySymbols(object);
          const propNames = Object.getOwnPropertyNames(object);
          const prototype = Object.getPrototypeOf(object);
          return [...propNames, ...symbols].reduce(
            (propertiesObject, propName) => {
              const prop = Object.getOwnPropertyDescriptor(object, propName);
              if (prop.hasOwnProperty("value"))
                prop.value = this._cp(prop.value, existingObjects);
              Object.defineProperty(propertiesObject, propName, prop);
              return propertiesObject;
            },
            Object.create(prototype)
          );
        }
        case "number": // new Number
          return new Number(object);
        case "string": // new String
          return new String(object);
        case "boolean": // new Boolean
          return new Boolean(object);
        case "bigint": // Object(BigInt())
          return object.valueOf();
        case "regexp": // /regexp/, new RegExp
          return new RegExp(object);
        case "null": // null
          return null;
        case "date":
          return new Date(object);
        case "map": {
          const map = new Map();
          for (const [key, value] of object)
            map.set(key, this._cp(value, existingObjects));
          return map;
        }
        case "set":
          return new Set(object);
      }
    // primitive type, function
    return object;
  }
}
class DoSheet extends BaseClassWrapper {
  constructor(obj) {
    super();
    this.dbIdKey = "_ID";
    this.uuidKey = "UUID";
    let { sheetId, sheetName, dataLabelArry, options } = obj;
    this.options = options ? options : { isIncrement: true, isUUID: true };
    if (this.options.isUUID && dataLabelArry.indexOf(this.uuidKey) === -1) {
      dataLabelArry.unshift(this.uuidKey);
    }
    if (
      this.options.isIncrement &&
      dataLabelArry.indexOf(this.dbIdKey) === -1
    ) {
      dataLabelArry.unshift(this.dbIdKey);
    }

    if (!sheetId) sheetId = MASTER_SPREAD_SHEET_ID;
    this.sheetId = sheetId;
    this.sheetName = sheetName;
    if (dataLabelArry) {
      this.dataLabelArry = dataLabelArry;
      this.isDatabase = true;
    } else {
      this.isDatabase = false;
    }
    this.initField();

    //field
    //auto
    this.spreadSheet;
    this.sheet;
    this.sheetDataArry = [];
    this.sheetDataObjArry = [];
  }
  //getter(プロパティ情報を取得)
  get some() {
    return this.sheetId;
  }

  get getDataForClient() {
    let obj = {
      sheetName: this.sheetName,
      dataLabelArry: this.dataLabelArry,
      sheetDataArry: this.sheetDataArry,
      sheetDataObjArry: this.sheetDataObjArry,
      // sheetDataArry: this.updateSheetDataArry(),
    };
    return this._cp(obj);
  }
  get getDataForObj() {
    this.initSheetDataObjArry();
    return this._cp(this.sheetDataObjArry);
  }
  get getSheetDataArry() {
    return this._cp(this.sheetDataArry);
  }
  get getDataLabelArry() {
    return this.dataLabelArry;
  }

  //static (インスタンスを引数とする処理)
  static some2(a, b) {
    return a.sheetId + b.sheetId;
  }

  //meshod(インスタンスごとに処理を行う)
  //initter
  async initField() {
    this.spreadSheet = SpreadsheetApp.openById(this.sheetId);
    let sheet = this.spreadSheet.getSheetByName(this.sheetName);
    if (sheet) this.sheet = sheet;
    else this.sheet = this.spreadSheet.insertSheet(this.sheetName, 0);
    this.sheetDataArry = await this.updateSheetDataArry();
  }
  initSheetTemplate() {
    const { SOLID_MEDIUM, DOUBLE } = SpreadsheetApp.BorderStyle;
    const startLabel_col = 1;
    const endLabel_row = this.dataLabelArry.length;

    // this.sheet.appendRow(this.dataLabelArry);
    this.sheet
      .getRange(startLabel_col, 1, 1, endLabel_row)
      .setValues([this.dataLabelArry])
      .setFontWeight("bold")
      .setBorder(null, null, true, null, null, null, "black", SOLID_MEDIUM);
  }
  initSheetDataObjArry() {
    let list = this.sheetDataArry.map((dataArry) => {
      let obj = {};
      this.dataLabelArry.forEach((key, key_i) => {
        obj[key] = dataArry[key_i];
      });
      return obj;
    });
    this.sheetDataObjArry = list;

    return list;
  }
  async isValid(data) {
    await this.updateSheetDataArry();
    let lastData = this.sheetDataArry.pop();

    if (Array.isArray(data)) {
      //arry

      //valid01 配列の長さがデータラベルと等しい
      let dataLength = data.length;
      if (this.options.isIncrement) dataLength += 1;
      if (this.options.isUUID) dataLength += 1;

      if (this.dataLabelArry.length !== dataLength) {
        debug(
          "error:validate data length is not same dataLabelArry length",
          data
        );
        return false;
      }

      //valid02 既にあるデータの長さと挿入するデータの長さが等しい
      if (lastData && lastData.length !== dataLength) {
        debug("error:validate data length is not same last data length", data);
        return false;
      }

      return true;
    } else if (typeof data === "object") {
      if (this.options.isIncrement) {
        data[this.dbIdKey] = {};
      }
      if (this.options.isUUID) {
        data[this.uuidKey] = {};
      }
      const dataKeyArry = Object.keys(data);
      //valid01 objectのkeyとDBのkeyが一致しているかチェック
      let isNotKeySame = this.dataLabelArry.find((label) => {
        return dataKeyArry.indexOf(label) === -1;
      });
      debug("isNotKeySame", isNotKeySame, dataKeyArry);

      if (isNotKeySame) {
        debug(
          "error:validate data key is not same dataLabelArry key",
          dataKeyArry
        );
        return false;
      }

      //valid02 keyの長さが一致する。
      if (this.dataLabelArry.length !== dataKeyArry.length) {
        debug(
          "error:validate data key length is not equal to the dataLabelArry",
          "label:" + this.dataLabelArry.length + " data:" + dataKeyArry.length
        );
        return false;
      }

      //valid3 既にあるデータの長さと挿入するデータの長さが等しい
      if (lastData.length !== dataKeyArry.length) {
        debug("error:validate data length is not same last data length", data);
        return false;
      }

      //result true
      return true;
    } else {
      debug("error:validate data is not array or object", data);
      return false;
    }
  }
  //action
  async updateSheetDataArry() {
    if (this.isDatabase) {
      //データベース仕様のシートを取得する場合
      let lastRow = this.sheet.getLastRow();

      let sheetDataArry = [];
      if (lastRow === 0) {
        //白紙
        this.initSheetTemplate();
        this.sheetDataArry = sheetDataArry;
      } else if (lastRow === 1) {
        //データラベルのみ
        this.sheetDataArry = sheetDataArry;
      } else {
        let lastCol = this.sheet.getLastColumn();
        sheetDataArry = this.sheet
          .getRange(2, 1, lastRow - 1, lastCol)
          .getValues();
        this.sheetDataArry = sheetDataArry;
        this.initSheetDataObjArry();
      }
      return sheetDataArry;
    } else {
      //既存のシートを取得する場合
      let lastRow = this.sheet.getLastRow();
      let lastCol = this.sheet.getLastColumn();
      let sheetDataArry = this.sheet
        .getRange(1, 1, lastRow, lastCol)
        .getValues();
      this.sheetDataArry = sheetDataArry;
      return sheetDataArry;
    }
  }

  filtered({ key, filterItem, isOneItem, toLabelObj, isExist }) {
    //sheetDataArryを調整
    //isOneItem: 一次元配列で１つのデータのみを返す。(findメソッドライク)
    //toLabelObj: labelをkeyとしてオブジェクトを返す。
    //isExist: filterしたアイテムが見つからなかった場合はfalseを返す。
    //find key index
    let keyIndex = 0;
    let filteredArry = [];
    if (isNaN(Number(key))) {
      //object key
      keyIndex = this.dataLabelArry.indexOf(key);
      if (keyIndex < 0) {
        debug(
          "error: can not find key=" +
            key +
            " in dataLabelArry=" +
            this.dataLabelArry
        );
        if (isExist) return false;
        return [];
      }
    }

    //filter
    if (typeof filterItem === "function") {
      //任意関数
      return filterItem(this.sheetDataArry);
    } else if (Array.isArray(filterItem)) {
      //複数フィルター

      //そのうち実装
      if (isExist) return false;
      return [];
    } else {
      filteredArry = this.sheetDataArry.filter((sheetData) => {
        return sheetData[keyIndex] === filterItem;
      });

      if (isExist) {
        if (filteredArry.length === 0) return false;
      }

      //toLabelObj
      if (toLabelObj) {
        // debug("filteredArry", filteredArry);
        if (filteredArry.length === 0) {
          if (isExist) return false;
          return {};
        }
        filteredArry = filteredArry.map((dataArr, data_i) => {
          let row = dataArr[0] + 1;
          let obj = {};
          obj.index = {};
          this.dataLabelArry.forEach((key, key_i) => {
            let col = key_i + 1;
            obj[key] = dataArr[key_i];
            obj.index[key] = { row, col };
          });
          return obj;
        });
      }
      //isOneItem
      if (isOneItem && filteredArry.length > 0) filteredArry = filteredArry[0];

      return filteredArry;
    }
  }
  async appendRow(arr, option) {
    // debug('appendRow',arr)
    await this.updateSheetDataArry();
    let sheetDataArry = this.getSheetDataArry;
    // debug("appendRow sheetDataArry", sheetDataArry);

    if (Array.isArray(arr)) {
      if (this.options.isUUID) {
        arr.unshift(Utilities.getUuid());
      }
      if (this.options.isIncrement) {
        let lastId = sheetDataArry.length;
        arr.unshift(lastId + 1);
      }
      let lastCol = this.dataLabelArry.length;
      if (arr.length > lastCol || arr.length < lastCol) {
        debug("appendRow arry(" + arr.length + ") should be length=" + lastCol);
      }
      this.sheet.appendRow(arr);

      return arr;
    } else if (typeof arr === "object") {
      let appendArry = this.dataLabelArry.map((label) => {
        //validでappendするobjとlabelが一致することを保証すると仮定
        if (label === this.dbIdKey) return sheetDataArry.length + 1;
        if (label === this.uuidKey) return Utilities.getUuid();
        return arr[label];
      });
      // debug("appendArry", appendArry);
      this.sheet.appendRow(appendArry);
      return appendArry;
    } else {
      debug("error:appendRow item is not array or object");
      return false;
    }
  }
  setValue({ sRow, sCol, numRow, numCol, value }) {
    if (!numRow) numRow = 1;
    if (!numCol) numCol = 1;
    debug("setValue", sRow, sCol, value);
    this.sheet.getRange(sRow, sCol, numRow, numCol).setValue(value);
  }
}
class DoDatabase extends BaseClassWrapper {
  constructor(obj) {
    super();
    this.dbIdKey = "_ID";
    this.uuidKey = "UUID";

    let { sheetId, sheetName, options } = obj;

    this.options = options ? options : { isIncrement: true, isUUID: true };
    if (!sheetId) sheetId = MASTER_SPREAD_SHEET_ID;
    this.sheetId = sheetId;
    // this.dataLabelArry = dataLabelArry;

    //
    this.databaseArry = [];
    this.spreadSheet;
    this.sheet;
    this.initDatabase();
  }
  async initDatabase() {
    this.spreadSheet = SpreadsheetApp.openById(this.sheetId);
    let sheetNameArry = this.spreadSheet
      .getSheets()
      .map((sheet) => sheet.getName());
    //createDatabase
    sheetNameArry.forEach(async (name) => {
      let dataLabelArry = await this.getDataLabelArry(name);
      // debug("tes dataLabelArry", dataLabelArry);
      if (dataLabelArry) {
        this.createDatabase({
          sheetName: name,
          dataLabelArry,
        });
        // debug("this.databaseArry", this.databaseArry);
      }
    });
  }
  async getDataLabelArry(sheetName) {
    let sheet = this.spreadSheet.getSheetByName(sheetName);
    if (!sheet) return false;
    let lastCol = sheet.getLastColumn();
    let dataLabelArry = await sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (this.options.isIncrement && dataLabelArry.indexOf(this.dbIdKey) === -1)
      return false;
    if (this.options.isUUID && dataLabelArry.indexOf(this.uuidKey) === -1)
      return false;
    return dataLabelArry;
  }
  getDatabaseByName(name) {
    return this.databaseArry.find((db) => {
      return db.sheetName === name;
    });
  }
  createDatabase({ sheetId, sheetName, dataLabelArry, options }) {
    if (!options) options = this.options;
    if (!sheetId) sheetId = this.sheetId;
    // let dataLabelArry = this.dataLabelArry;
    if (!sheetName || !dataLabelArry) {
      debug(
        "error:sheetName or dataLabelArry is invailed",
        sheetName,
        dataLabelArry
      );
      return false;
    } else {
      const createdSheet = new DoSheet({
        sheetId,
        sheetName,
        dataLabelArry,
        options,
      });
      this.databaseArry.push(createdSheet);
      return createdSheet;
    }
  }
}
const database_account = new DoDatabase({
  sheetId: MASTER_SPREAD_SHEET_ID,
  options: {
    isIncrement: true,
    isUUID: true,
  },
});

/**
 * 指定年月のデータ一覧を取得します
 * @param {Object} params
 * @param {String} params.yearMonth 年月
 * @returns {Object[]} 家計簿データ
 */
function onGet({ sheetName }) {
  const ymReg = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

  if (!ymReg.test(sheetName)) {
    return {
      error: "正しい形式で入力してください",
    };
  }
  let db = database_account.getDatabaseByName(sheetName);
  if (db) {
    const list = db.getDataForObj;
    return list;
  } else {
    return {
      error: "データベースがありません",
    };
  }
}

/**
 * データを追加します
 * @param {Object} params
 * @param {Object} params.item 家計簿データ
 * @returns {Object} 追加した家計簿データ
 */
async function onPost({ item, options }) {
  debug("onPost", item);
  const { createAt } = item;
  const sheetName = createAt.slice(0, 7);
  const sheet_db =
    database_account.getDatabaseByName(sheetName) ||
    database_account.createDatabase({
      sheetName: sheetName,
      dataLabelArry: [
        "createAt",
        "deleteAt",
        "updateAt",
        "title",
        "category",
        "tags",
        "income",
        "outgo",
        "memo",
      ],
      options: options,
    });
  // let item_test = { b: 10, c: 20 };
  // item = item_test;
  if (!(await sheet_db.isValid(item))) {
    return {
      error: "isValid error:正しい形式で入力してください",
    };
  }

  let appendTestObj = {
    date: "date",
    title: "title",
    category: "category",
    tags: "tags",
    income: "income",
    outgo: "outgo",
    memo: "memo22",
  };
  let appendTestArry = [1, 2, 3, 4, 5, 6, 7];

  let appendedArry = await sheet_db.appendRow(item);
  // debug("appendedArry", appendedArry);
  if (appendedArry) return appendedArry;
  else
    return {
      error: "appendRowエラー",
    };
}

async function onDelete({ sheetName, id, uuid }) {
  let _ID_temp = id;
  let _ID = Number(id);
  let date_here = new Date();
  date_here = formatDate(date_here, "JST", "yyyy-MM-dd_HH-mm");
  const sheet_db = database_account.getDatabaseByName(sheetName);
  let deleteAt_i = sheet_db.getDataLabelArry.indexOf("deleteAt");
  //valid01
  if (!sheet_db)
    return {
      error: "onDelete error:sheet(" + sheetName + ") does not exist",
    };
  //valid02
  if (deleteAt_i === -1) {
    return {
      error:
        "onDelete error: deleteAt label does not exist at (" + sheetName + ")",
    };
  }

  if (id) {
    //valid01
    if (isNaN(_ID)) {
      return {
        error: "onDelete error: _ID is NaN(" + _ID_temp + ")",
      };
    }

    let dataRow = sheet_db.getSheetDataArry[_ID - 1];
    //valid04
    if (!dataRow) {
      return {
        error:
          "onDelete error: data does not exist at (" +
          sheetName +
          " of _ID:" +
          _ID +
          ")",
      };
    }
    let sRow = _ID + 1;
    let sCol = deleteAt_i + 1;

    sheet_db.setValue({ sRow, sCol, value: date_here });

    return { message: "削除しました。" };
  } else if (uuid) {
    let sRow = null;
    let sCol = deleteAt_i + 1;
    const uuid_i = sheet_db.getDataLabelArry.indexOf("UUID");
    await sheet_db.updateSheetDataArry();

    let deleteData = sheet_db.getSheetDataArry.find((dataArry, data_i) => {
      if (dataArry[uuid_i] === uuid) {
        sRow = data_i + 2;
        return true;
      }
      return false;
    });
    if (deleteData) {
      sheet_db.setValue({ sRow, sCol, value: date_here });
      return { message: "削除しました。" };
    }
    return {
      error:
        "onDelete error: data does not exist at (" +
        sheetName +
        " of UUID:" +
        uuid +
        ")",
    };
  }
}

function onPut({ sheetName_before, item }) {
  const { createAt } = item;
  const sheetName = createAt.slice(0, 7);
  if (sheetName_before !== sheetName) {
    onDelete({ sheetName: sheetName_before, id: item._ID });
    return onPost({ item });
  }
}

/**
 * ログをシートに記録します
 * @param {any} msgArry
 */

function debug(...msgArry) {
  if (!isDebugClear) {
    logStartTime = new Date().getTime();
    sheet_log.clear();
  }
  isDebugClear = true;
  let diffTime = new Date().getTime() - logStartTime;
  let res = [new Date(), diffTime, "DEV"];
  msgArry.forEach((msg) => {
    if (msg === undefined) {
      res.push("undefined");
    } else if (Array.isArray(msg)) {
      // res.push(typeof msg);
      res.push(JSON.stringify(msg, undefined, 3));
    } else if (typeof msg === "object") {
      // res.push(typeof msg);
      res.push(JSON.stringify(msg, undefined, 3));
    } else {
      // res.push(typeof msg);
      res.push(msg);
    }
  });
  sheet_log.appendRow(res);

  if (logMaxRow < sheet_log.getLastRow()) {
    sheet_log.deleteRow(2);
  }
}
