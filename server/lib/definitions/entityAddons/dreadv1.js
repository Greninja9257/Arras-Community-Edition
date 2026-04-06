module.exports = require("./dreadnoughts/dreadv1.js");

// Legacy compatibility alias.
if (global.Class?.dreadnought_dreadsV1 && !global.Class.dreadOfficialV1) {
    global.Class.dreadOfficialV1 = global.Class.dreadnought_dreadsV1;
}
