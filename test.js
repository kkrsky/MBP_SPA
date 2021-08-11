const clone = (object, existingObjects) => {
  const typeOf = (obj) =>
    Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  if (!existingObjects) existingObjects = [];
  else if (existingObjects.indexOf(object) !== -1)
    throw new Error("Recursive reference exists.");
  else existingObjects = [...existingObjects, object];
  if (Array.isArray(object))
    // [], new Array
    return object.map((value) => clone(value, existingObjects));
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
              prop.value = clone(prop.value, existingObjects);
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
          map.set(key, clone(value, existingObjects));
        return map;
      }
      case "set":
        return new Set(object);
    }
  // primitive type, function
  return object;
};
