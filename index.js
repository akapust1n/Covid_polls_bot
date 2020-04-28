
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

const $ = jQuery = require('jquery')(window);
const Telegraf = require('telegraf')
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const moment = require("moment");
const Math = require('mathjs');

//---------------------------------------

//global vars
const token = fs.readFileSync('token', 'utf8').split("\n")[0];
var authorId = fs.readFileSync('authorId', 'utf8');
var chatId = 0;
const url = "https://xn--80aesfpebagmfblc0a.xn--p1ai/" // стопкоронавирус.рф
var lastDayOfPoll = 0;

//bot -----------------
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply('Welcome!'));
bot.hears('magicInit', (ctx) => {
    console.log(ctx.update.message);
    if (ctx.from.id == authorId) {
        chatId = ctx.update.message.chat.id;
    }
}); // todo rework
bot.hears('cr', (ctx) => {
    if (ctx.from.id == authorId) {
        poll(true);
    }
}) //бекдор создания опроса
bot.launch();

//main logic ----------------------
function createPoll(htmlPage) {
    //код функции ужас, мне норм.
    console.log('DDDDDd');
    console.log(chatId);
    if (chatId == 0)
        return;

    let numberOfCasesJq = $(htmlPage);
    numberOfCasesJq = $('.cv-countdown', numberOfCasesJq);
    if (numberOfCasesJq.length == 0) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших1");
        return;
    }
    const tryFindItems = numberOfCasesJq.find(".cv-countdown__item");
    if (tryFindItems.length == undefined) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших2");
        return;
    }

    let numberOfCasesStr = undefined;
    $(".cv-countdown__item", numberOfCasesJq).each(function (index) {
        if (index == 2) {
            console.log(index + ": " + $(this).html());
            numberOfCasesStr = $(this).find(".cv-countdown__item-value").html();
            console.log(numberOfCasesStr);
        }
    });
    if (numberOfCasesStr == undefined || numberOfCasesStr.length == 0) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших3");
        return;
    }

    numberOfCasesStr = numberOfCasesStr.replace("<", "");
    numberOfCasesStr = numberOfCasesStr.replace(">", "");
    numberOfCasesStr = numberOfCasesStr.replace("span", "");
    numberOfCasesStr = numberOfCasesStr.replace(" ", "");

    const numberOfCases = parseInt(numberOfCasesStr);

    if (numberOfCases == NaN) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу извлечь количество заболевших");
        return;
    }
    const option1 = Math.floor(Math.floor(numberOfCases * 0.9) / 100) * 100;
    let divider = 1000;
    if (option1 < 1000) {
        divider = 100; //todo сделать нормально
    }
    const step = Math.floor(option1 / divider) * 100;
    const option2 = option1 + step;
    const option3 = option2 + step;
    const option4 = option3 + step;
    console.log(option1);
    bot.telegram.sendPoll(chatId, "О скольких новых официально заболевших в России будет объявлено сегодня?",
        ["<" + option1.toString(), option1.toString() + "-" + option2.toString(),
        option2.toString() + "-" + option3.toString(), option3.toString() + "-" + option4.toString(), option4.toString() + "+"],
        { is_anonymous: false });
}


function poll(forceCreate) {
    let xhr = new XMLHttpRequest();

    xhr.open('GET', url, false);

    xhr.send();
    const date = new Date();
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    const day = date.getUTCDay();
    if (forceCreate || hours == 0 && minutes == 22 && day != lastDayOfPoll) // german time
    {
        lastDayOfPoll = day;
        createPoll(xhr.responseText);
    }
    //setTimeout(poll, 15 * 60 * 1000);
    if (!forceCreate) {
        setTimeout(poll, 1000 * 50);// зачем каждые 50 секунд опрашивать ради одного опроса в сутки - хз
    }
}

poll();