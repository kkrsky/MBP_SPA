const MASTER_SPREAD_SHEET_ID = getEnv("MASTER_SPREAD_SHEET_ID");
const LOG_FILE_ID = "1MTtf7Z6pnP_Bq3lTXBnd4HbYDTx9LE5prPUYoXYxrFE";
const logMaxRow = 101;
const spreadSheet_log = SpreadsheetApp.openById(MASTER_SPREAD_SHEET_ID);
const spreadSheet_master = SpreadsheetApp.openById(MASTER_SPREAD_SHEET_ID);
const sheet_log = spreadSheet_log.getSheetByName("log");
///////////////////////////
/////////utils/////////////
///////////////////////////
async function test() {
  const result = await onPost({
    item: {
      date: "2020-07-01",
      title: "支出サンプル",
      category: "食費",
      tags: "タグ1,タグ2",
      income: null,
      outgo: 3000,
      memo: "メモメモ1",
      memo2: "メモメモ1",
    },
  });
  // const result = onGet({ yearMonth: "2020-07" });
  // insertTemplate("2021-08");
  // Logger.log(result);
  debug("result", result);
}
//private key
function getEnv(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
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
    let { sheetId, sheetName, dataLabelArry, isIncrement } = obj;
    this.isIncrement = isIncrement ? true : false;
    const incrementId = "_ID";
    if (this.isIncrement && dataLabelArry.indexOf(incrementId) === -1) {
      dataLabelArry.unshift(incrementId);
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
    return this._cp(this.sheetDataObjArry);
  }
  get getSheetDataArry() {
    return this._cp(this.sheetDataArry);
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
        if (filteredArry.length === 0) return {};
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
      if (this.isIncrement) {
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
        //validでappendするobjとlabelが一致することを保証する
        if (label === "_ID") return sheetDataArry.length + 1;
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
    this.sheet.getRange(sRow, sCol, numRow, numCol).setValue(value);
  }
}
class DoDatabase extends BaseClassWrapper {
  constructor(obj) {
    super();
    let { sheetId, sheetName, dataLabelArry, isIncrement } = obj;
    this.isIncrement = isIncrement ? true : false;
    const incrementId = "_ID";
    if (this.isIncrement && dataLabelArry.indexOf(incrementId) === -1) {
      dataLabelArry.unshift(incrementId);
    }
    if (!sheetId) sheetId = MASTER_SPREAD_SHEET_ID;
    this.sheetId = sheetId;
    this.dataLabelArry = dataLabelArry;

    //
    this.databaseArry = [];
    this.initDatabase();
  }
  initDatabase() {
    this.createDatabase({
      sheetName: "2021-08",
    });
    this.createDatabase({
      sheetName: "2021-07",
    });
  }
  isValid(data) {
    if (Array.isArray(data)) {
      //arry
      //valid01 配列の長さがデータラベルと等しい
      let dataLength = this.isIncrement ? data.length + 1 : data.length;
      if (this.dataLabelArry.length !== dataLength) {
        debug(
          "error:validate data length is not same dataLabelArry length",
          data
        );
        return false;
      }
      return true;

      //valid02
    } else if (typeof data === "object") {
      if (this.isIncrement) {
        data["_ID"] = {};
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

      //result true
      return true;
    } else {
      debug("error:validate data is not array or object", data);
      return false;
    }
  }
  getDatabaseByName(name) {
    return this.databaseArry.find((db) => {
      return db.sheetName === name;
    });
  }
  createDatabase({ sheetId, sheetName, options }) {
    let isIncrement = this.isIncrement;
    let dataLabelArry = this.dataLabelArry;
    if (!sheetName) {
      debug("error:sheetName or dataLabelArry is invailed");
      return false;
    } else {
      const createdSheet = new DoSheet({
        sheetId,
        sheetName,
        dataLabelArry,
        isIncrement,
      });
      this.databaseArry.push(createdSheet);
      return createdSheet;
    }
  }
}
const database_account = new DoDatabase({
  sheetId: MASTER_SPREAD_SHEET_ID,
  dataLabelArry: [
    "date",
    "title",
    "category",
    "tags",
    "income",
    "outgo",
    "memo",
  ],
  isIncrement: true,
});

/**
 * 指定年月のデータ一覧を取得します
 * @param {Object} params
 * @param {String} params.yearMonth 年月
 * @returns {Object[]} 家計簿データ
 */
function onGet({ yearMonth }) {
  const ymReg = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

  if (!ymReg.test(yearMonth)) {
    return {
      error: "正しい形式で入力してください",
    };
  }
  let db = database_account.getDatabaseByName(yearMonth);
  debug("db", db);
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
async function onPost({ item }) {
  debug("onPost", item);
  debug("database_account.isValid(item", database_account.isValid(item));
  if (!database_account.isValid(item)) {
    return {
      error: "isValid error:正しい形式で入力してください",
    };
  }
  const { date } = item;
  const yearMonth = date.slice(0, 7);

  let sheet_db =
    database_account.getDatabaseByName(yearMonth) ||
    database_account.createDatabase({
      sheetName: yearMonth,
    });
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
  debug("appendedArry", appendedArry);
  if (appendedArry) return appendedArry;
  else
    return {
      error: "appendRowエラー",
    };
}

/**
 * ログをシートに記録します
 * @param {String} level
 * @param {String} message
 */
let isDebugClear = false;
let logStartTime = 0;
function debug(...msgArry) {
  if (!isDebugClear) {
    logStartTime = new Date().getTime();
    sheet_log.clear();
  }
  isDebugClear = true;
  let diffTime = new Date().getTime() - logStartTime;
  let res = [new Date(), diffTime, "DEV"];
  msgArry.forEach((msg) => {
    if (Array.isArray(msg)) {
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
