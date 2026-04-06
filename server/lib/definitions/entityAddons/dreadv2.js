module.exports = require("./dreadnoughts/dreadv2.js");

// Legacy compatibility alias.
if (global.Class?.dreadnought_dreadsV2 && !global.Class.dreadOfficialV2) {
    global.Class.dreadOfficialV2 = global.Class.dreadnought_dreadsV2;
}
