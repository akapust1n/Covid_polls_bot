
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

const $ = jQuery = require('jquery')(window);
const Telegraf = require('telegraf')
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const Math = require('mathjs');

//---------------------------------------

//global vars
const token = fs.readFileSync('token', 'utf8').split("\n")[0];
var authorId = fs.readFileSync('authorId', 'utf8');
var chatId = 0;
const url = "https://xn--80aesfpebagmfblc0a.xn--p1ai/" // стопкоронавирус.рф
var lastDayOfPoll = 0;
var numberOfCases = 0;
var notifyAboutCovid = true;
//bot -----------------
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply('Welcome!'));
bot.hears('magicInit', (ctx) => {
    if (ctx.from.id == authorId) {
        chatId = ctx.update.message.chat.id;
    }
}); // todo rework
bot.hears('cr', (ctx) => {
    if (ctx.from.id == authorId) {
        poll(true);
    }
}) //бекдор создания опроса

bot.hears('stopNotifyAboutCovid', (ctx) => {
    if (ctx.from.id == authorId) {
        notifyAboutCovid = false;
    }
})

bot.hears('startNotifyAboutCovid', (ctx) => {
    if (ctx.from.id == authorId) {
        notifyAboutCovid = true;
    }
})

function getCovidPage() {
    let xhr = new XMLHttpRequest();

    xhr.open('GET', url, false);

    xhr.send();
    return xhr.responseText;
}
function getNumberOfCases(htmlPage) {
    if (chatId == 0)
        return NaN;
    let numberOfCasesJq = $(htmlPage);
    numberOfCasesJq = $('.cv-countdown', numberOfCasesJq);
    if (numberOfCasesJq.length == 0) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших1");
        return NaN;
    }
    const tryFindItems = numberOfCasesJq.find(".cv-countdown__item");
    if (tryFindItems.length == undefined) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших2");
        return NaN;
    }

    let numberOfCasesStr = undefined;
    $(".cv-countdown__item", numberOfCasesJq).each(function (index) {
        if (index == 2) {
            numberOfCasesStr = $(this).find(".cv-countdown__item-value").html();
        }
    });
    if (numberOfCasesStr == undefined || numberOfCasesStr.length == 0) {
        bot.telegram.sendMessage(chatId, "не удалось создать опрос. не могу найти количество заболевших3");
        return NaN;
    }

    numberOfCasesStr = numberOfCasesStr.replace("<", "");
    numberOfCasesStr = numberOfCasesStr.replace(">", "");
    numberOfCasesStr = numberOfCasesStr.replace("span", "");
    numberOfCasesStr = numberOfCasesStr.replace(" ", "");
    return parseInt(numberOfCasesStr);
}

bot.command('num_of_covid', (ctx) => {
    let tempNumberOfCases = numberOfCases;
    if (numberOfCases == 0) { //no cache
        tempNumberOfCases = getNumberOfCases(getCovidPage());
    }
    if (tempNumberOfCases != NaN) {
        bot.telegram.sendMessage(chatId, "Сегодня заболело " + tempNumberOfCases.toString() + " людей");
    }
})

bot.launch();



//main logic ----------------------
function createPoll(htmlPage) {
    //код функции ужас, мне норм.
    const tempNumberOfCases = getNumberOfCases(htmlPage);
    if (tempNumberOfCases == NaN) {
        return;
    }
    numberOfCases = tempNumberOfCases;

    const option1 = Math.floor(Math.floor(numberOfCases * 0.9) / 100) * 100;
    let divider = 1000;
    if (option1 < 1000) {
        divider = 100; //todo сделать нормально
    }
    const step = Math.floor(option1 / divider) * 100;
    const option2 = option1 + step;
    const option3 = option2 + step;
    const option4 = option3 + step;
    bot.telegram.sendPoll(chatId, "О скольких новых официально заболевших в России будет объявлено сегодня?",
        ["<" + option1.toString(), option1.toString() + "-" + option2.toString(),
        option2.toString() + "-" + option3.toString(), option3.toString() + "-" + option4.toString(), option4.toString() + "+"],
        { is_anonymous: false });
}


function poll(forceCreate) {

    const covidPage = getCovidPage();
    const date = new Date();
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    const day = date.getUTCDay();
    if (forceCreate || hours == 19 && minutes == 57 && day != lastDayOfPoll) // german time
    {
        lastDayOfPoll = day;
        createPoll(covidPage);
    }
    //setTimeout(poll, 15 * 60 * 1000);
    if (!forceCreate) {
        const tempGetNumberOfCases = getNumberOfCases(covidPage);
        if (numberOfCases != 0 && notifyAboutCovid && tempGetNumberOfCases && tempGetNumberOfCases != numberOfCases
            && lastDayOfPoll == day)
        //нужно создать хотя бы один опрос, чтобы бот продолжал чекать количество заболевших. хак.
        //предполагается, что день создания опроса и день инфы - один день. хак на случай "рандомных" обновлений сайта
        {
            numberOfCases = tempGetNumberOfCases;
            bot.telegram.sendMessage(chatId, "Сегодня заболело " + numberOfCases.toString() + " человек. Поздравляем победителей!");
        }
    }
    setTimeout(poll, 1000 * 50);

}
poll();