// ==UserScript==
// @name                微信公众号 PDF 导出脚本
// @namespace           mem.ac/weixin-print-to-pdf
// @version             1.4.1
// @description         方便地导出公众号文章中以图片形式上传的试卷，让您一键开卷！
// @author              memset0
// @license             AGPL-v3.0
// @match               https://mp.weixin.qq.com/s*
// @updateurl           https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @downloadurl         https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @run-at              document-start
// ==/UserScript==

const CSS = `
    .mem-print-container {
    }
    #mem-print-main {
        padding: 16px;
        line-height: 0px;
        margin-bottom: 20px;
        border: 1px solid #D9DADC;
    }
    #mem-print-main button {
        margin-right: 8px;
    }
`;

function log(...args) {
    console.log('[@memset0/weixin-print-to-pdf]', ...args);
}

function isInteger(value) {
    const converted = +value;
    return !isNaN(converted) && Number.isInteger(converted);
}

function applyFilter(iterable, filterPattern) {
    const illegalFilter = (msg) => (alert('Illegal filter: ' + String(msg)), []);
    const flag = [];
    for (const _ in iterable) {
        flag.push(false);
    }
    if (!filterPattern || filterPattern == '-') {
        for (const i in flag) {
            flag[+i] = true;
        }
    } else {
        const filters = filterPattern.split(',');
        for (const filter of filters) {
            if (filter.includes('-')) {
                const splited = filter.split('-');
                if (splited.length > 2) {
                    return illegalFilter('wrong interval');
                }
                if (!splited[0]) {
                    splited[0] = 0;
                }
                if (!splited[1]) {
                    splited[1] = iterable.length - 1;
                }
                if (!isInteger(splited[0]) || !isInteger(splited[1])) {
                    return illegalFilter('not a number');
                }
                for (let i = +splited[0]; i <= +splited[1]; i++) {
                    flag[i - 1] = true;
                }
            } else {
                if (!isInteger(filter)) {
                    return illegalFilter('not a number');
                }
                flag[+filter - 1] = true;
            }
        }
    }
    const result = [];
    for (const i in iterable) {
        if (flag[+i]) {
            result.push(iterable[+i]);
        }
    }
    return result;
}

function scrollTo(type) {
    const scrollSpeed = 50;

    if (type !== 'top' && type !== 'bottom') { throw new Error('type error!'); }

    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    let promiseResolve = null;
    let lastTimestamp = null;
    let scrollRecords = [];

    function scrollAnimated(timestamp) {
        const currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
        scrollRecords.push(currentScroll);
        if (scrollRecords.length > 5) {
            scrollRecords.shift();
            let finishedFlag = true;
            for (let i = 1; i < scrollRecords.length; i++) {
                if (scrollRecords[i] !== scrollRecords[i - 1]) {
                    finishedFlag = false;
                    break;
                }
            }
            if (finishedFlag) {
                // log('finish', scrollRecords, finishedFlag);
                return promiseResolve(type);
            }
        }

        if (lastTimestamp === null) {
            lastTimestamp = timestamp;
        } else {
            const deltaTimestamp = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            window.scrollTo(0, currentScroll + scrollSpeed * (type === 'top' ? -deltaTimestamp : +deltaTimestamp));
            log(type, currentScroll, scrollHeight, deltaTimestamp);
        }
        window.requestAnimationFrame(scrollAnimated);
    }

    return new Promise((resolve) => {
        promiseResolve = resolve;
        window.requestAnimationFrame(scrollAnimated);
    });
}

async function printToPdf(width, height, margin, html) {
    log('print to pdf', width, height, margin);
    // await scrollTo('top');
    // await scrollTo('bottom');
    const pixeledMargin = String(margin).split(' ').map((s) => (s + 'px')).join(' ');
    const printStyle =
        '<style> /* normalize browsers */ html, body { margin: 0 !important; padding: 0 !important; } </style>' +
        '<style> /* page settings */ @page { size: ' + width + 'px ' + height + 'px; margin: ' + pixeledMargin + '; } </style>' +
        '<style> div.page { width: ' + (width - margin * 2) + 'px; height: ' + (height - margin * 2) + 'px; } </style>';
    html = printStyle + html;

    // const document = unsafeWindow.document;   // seemingly needless
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    log('blob url:', blobUrl);

    const $iframe = document.createElement('iframe');
    $iframe.style.display = 'none';
    $iframe.src = blobUrl;
    document.body.appendChild($iframe);
    $iframe.onload = () => {
        setTimeout(() => {
            $iframe.focus();
            $iframe.contentWindow.print();
        }, 1);
    };
}

function generateHtmlFromContent() {
    let html = '';
    for (const $element of document.getElementById('js_content').children) {
        console.log($element);
        html += $element.outerHTML + '\n\n';
    }
    return html;
}

function generateHtmlFromPictures() {
    const minimalImageSize = 100;

    let html = '<style>' +
        'div.page { page-break-after: always; display: flex; justify-content: center; align-items: center; }' +
        'div.page>img { width: 100%; max-width: 100%; max-height: 100%; }' +
        'div.page>img { border: solid 1px #fff0; } /* this line is magic */' +
        '</style>';
    for (const $image of document.getElementById('js_content').querySelectorAll('img')) {
        const imageSrc = $image.getAttribute('data-src');
        const imageWidth = $image.getAttribute('width');
        if (!imageSrc) { continue; }
        if (imageWidth && imageWidth < minimalImageSize) { continue; }
        html += '<div class="page"><img src="' + imageSrc + '"></div>';
        // log(imageWidth, imageSrc);
    }
    return html;
}

class Settings {
    constructor(storageKey = 'mem-print-settings') {
        const defaultData = {
            // Page Settings
            width: 797,   // A4 8.3inch * 11.7inch
            height: 1123,
            margin: 0,
            zoom: 1,
            // Element filters
            filter: '',
        };
        this.data = {}
        if (localStorage.getItem(storageKey)) {
            const storaged = localStorage.getItem(storageKey);
            if (storaged) {
                this.data = JSON.parse(storaged);
            }
        }
        for (const key in defaultData) {
            if (!Object.keys(this.data).includes(key)) {
                this.data[key] = defaultData[key];
            }
        }
    }
}

async function main() {
    function generateDiv(id, className) {
        const $div = document.createElement('div');
        $div.id = id;
        $div.className = className;
        return $div;
    }
    function generateButton(buttonName, callback) {
        const $btn = document.createElement('button');
        $btn.innerText = buttonName;
        $btn.style = 'padding-left: 4px; padding-right: 4px;'
        $btn.onclick = () => {
            log('Triggered by', [buttonName], $btn);
            callback();
        }
        return $btn;
    }

    const settings = new Settings();
    log(settings.data);

    $mainContainer = generateDiv('mem-print-main', 'mem-print-container');
    $sideContainer = generateDiv('mem-print-side', 'mem-print-container');

    $style = document.createElement('style');
    $style.innerHTML = CSS;
    $mainContainer.appendChild($style);

    document.getElementsByClassName('qr_code_pc')[0].appendChild($sideContainer);
    document.getElementById('img-content').parentNode.insertBefore($mainContainer, document.getElementById('img-content'));
    console.log($mainContainer, $sideContainer);

    printContent = () => {
        printToPdf(settings.data.width, settings.data.height, settings.data.margin, generateHtmlFromContent());
    }
    $mainContainer.appendChild(generateButton('Print Content', printContent));
    $sideContainer.appendChild(generateButton('Print Content', printContent));

    printPictures = () => {
        printToPdf(settings.data.width, settings.data.height, settings.data.margin, generateHtmlFromPictures());
    };
    $mainContainer.appendChild(generateButton('Print Pictures', printPictures));
    $sideContainer.appendChild(generateButton('Print Pictures', printPictures));

    $mainContainer.appendChild(generateButton('Settings', () => { settings.open(); }));
    $sideContainer.appendChild(generateButton('Settings', () => { settings.open(); }));
}

document.addEventListener('DOMContentLoaded', main);
