const {app, BrowserWindow, Menu, shell} = require("electron");

function set_default_mac_menu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {label: app.name, submenu: [{role: "about"}, {type: "separator"}, {role: "services"}, {type: "separator"}, {role: "hide"}, {role: "hideothers"}, {role: "unhide"}, {type: "separator"}, {role: "quit"}]},
        {label: "Window", submenu: [{role: "minimize"}, {role: "zoom"}, {type: "separator"}, {role: "front"}, {type: "separator"}, {role: "close"}]},
        {role: "help", submenu: [
            {label: "Visit Homepage", click: async () => {await shell.openExternal("http://www.andyh.org/flower_defense/")}}
        ]}
    ]));
}

app.once("ready", () => {
    const win = new BrowserWindow({width: 480, height: 768, useContentSize: true, show: false, maximizable: false, backgroundColor: "#000000"});
    win.loadFile("app/app.html");
    if (process.platform == "darwin") {
      set_default_mac_menu();
    } else {
        win.removeMenu();
    }
    win.resizable = false;
    win.once("ready-to-show", () => {win.show()});
});
