let keyboard = require("keyboard");
let submenu = require("submenu");
let storage = require("storage");
let dialog = require("dialog");
let notify = require("notification");

let context = {
    name: null,
    vpa: null,
    vpa1: null,
    vpa2: null,
    amount: 0,
};

function show_menu() {
    while (true) {
        if (context.vpa1 !== null && context.vpa2 !== null) {
            context.vpa = context.vpa1 + "@" + context.vpa2;
        }

        submenu.setHeader("UPI NFC Tag Maker")
        if (context.name === null) {
            submenu.addItem("Name: ____", 0);
        } else {
            submenu.addItem("Name: " + context.name, 0);
        }

        if (context.vpa1 === null) {
            submenu.addItem("VPA 1: ____", 1);
        } else {
            submenu.addItem("VPA 1: " + context.vpa1, 1);
        }

        if (context.vpa2 === null) {
            submenu.addItem("VPA 2: ____", 2);
        } else {
            submenu.addItem("VPA 2: " + context.vpa2, 2);
        }

        submenu.addItem("Amount: " + to_string(context.amount), 3);

        if (context.vpa !== null && context.name !== null) {
            submenu.addItem("Generate NFC File", 4);
        }

        let call_dispatcher = [ask_name, ask_vpa1, ask_vpa2, ask_amount];

        let result = submenu.show();
        if (result === undefined) {
            return;

        } else if (result === 4) {
            gen_ntag();
            write_path();
            return;
        } else {
            call_dispatcher[result]();
            result = null;
        }
    }
}


function ask_amount() {
    keyboard.setHeader("Enter Amount:");
    context.amount = parse_int(keyboard.text(100, "10", true));
}

function gen_uri() {
    let ret = "upi://pay?pa=" + context.vpa + "?pn=" + context.name;
    if (context.amount > 0) {
        ret += "?am=" + to_string(context.amount);
    }
    return ret;
}

function string_to_arraybuf(str) {
    let ret = [];
    for (let i = 0; i < str.length; i++) {
        ret.push(str.at(i));
    }
    ret.push(0xFE);
    for (let i = 0; i < (ret.length % 4); i++) {
        ret.push(0x00);
    }
    return ret;
}

function write_path() {
    keyboard.setHeader("Enter File Name:");
    let temp = "";
    if (context.amount > 0) {
        temp = "upi_" + to_string(context.amount) + "_" + context.vpa + ".nfc"
    } else {
        temp = "upi_" + context.vpa + ".nfc"
    }

    let name = keyboard.text(150, temp, true);
    let path = "/ext/nfc/" + name;
    storage.write(path, context.ntag);
    notify.success();
    notify.success();
    dialog.message("Done!", "File written to " + path);
}

function gen_ntag() {
    let uri = gen_uri();
    let uri_barr = string_to_arraybuf(uri);
    if (uri_barr.length > 180) {
        die("URI length cannot be more than 180 bytes!");
        return;
    }
    let page = 6;
    let to_write = "";
    to_write += "# Created using UPI NFC Tag Maker\nFiletype: Flipper NFC device\nVersion: 4\nDevice type: NTAG/Ultralight\nUID: 04 F8 46 FF A2 3E 82\nATQA: 00 44\nSAK: 00\nData format version: 2\nNTAG/Ultralight type: NTAG213\nSignature: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00\nMifare version: 00 04 04 02 01 00 0F 03\nCounter 0: 0\nTearing 0: 00\nCounter 1: 0\nTearing 1: 00\nCounter 2: 0\nTearing 2: 00\nPages total: 45\nPages read: 45\n";
    to_write += "Page 0: 04 F8 46 32\nPage 1: FF A2 3E 82\nPage 2: E1 48 00 00\nPage 3: E1 10 12 00\nPage 4: 03 " + to_hex_string(uri_barr.length + 5) + " D1 01\nPage 5: " + to_hex_string(uri_barr.length + 1) + " 55 00 " + to_hex_string(uri_barr[0]) + "\n";
    for (let i = 1; i < uri_barr.length; i = i + 4) {
        to_write += "Page " + to_string(page) + ":"
        for (let i2 = 0; i2 < 4; i2++) {
            let temp = to_hex_string(uri_barr[i+i2]);
            if (temp === "0") {
                temp = "00";
            }
            to_write += " " + temp;
        }
        to_write += "\n";
        page += 1;
    }

    for (let i = page; i < 40; i++) {
        to_write += "Page " + to_string(page) + ": 00 00 00 00\n"
        page += 1;
    }
    to_write += "Page 40: 00 00 00 BD\nPage 41: 04 00 00 FF\nPage 42: 00 05 00 00\nPage 43: FF FF FF FF\nPage 44: 00 00 00 00\nFailed authentication attempts: 0\n";
    context.ntag = to_write;
    return;
}

function ask_vpa1() {
    keyboard.setHeader("Enter VPA1:");
    context.vpa1 = keyboard.text(100, "someone", true);
}

function ask_vpa2(first) {
    keyboard.setHeader("Enter VPA2:");
    context.vpa2 = keyboard.text(100, "ybl", true);
}

function ask_name() {
    keyboard.setHeader("Enter Name:");
    context.name = keyboard.text(100, "Raju", true);
}

show_menu();
