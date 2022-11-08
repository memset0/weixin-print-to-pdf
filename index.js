// ==UserScript==
// @name                微信公众号 PDF 导出脚本
// @namespace           mem.ac/weixin-print-to-pdf
// @version             1.2.2
// @description         方便地导出公众号文章中以图片形式上传的试卷，让您一键开卷！
// @author              memset0
// @license             AGPL-v3.0
// @match               https://mp.weixin.qq.com/s*
// @updateurl           https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @downloadurl         https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @run-at              document-start
// ==/UserScript==

const scrollSpeed = 50;
const minimalImageSize = 100;

// A4 210mm * 297mm
// const pageWidth = 210;
// const pageHeight = 297;

// A4 8.3inch * 11.7inch
const pageWidth = 797 /* 796.8 */;
const pageHeight = 1123 /* 1123.2 */;

const pageMargin = 0;

function log(...args) {
    console.log('[@memset0/weixin-print-to-pdf]', ...args);
}

function scrollTo(type) {
    if (type !== 'top' && type !== 'bottom') { throw new Error('type error!'); }

    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    let promiseResolve = null;
    let lastTimestamp = null;
    let scrollRecords = [];

    function scrollAnimated(timestamp) {
        // log('scroll animated', timestamp);

        const currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
        scrollRecords.push(currentScroll);
        if (scrollRecords.length > 5) {
            scrollRecords.shift();
            let finishedFlag = true;
            for (let i = 1; i < scrollRecords.length; i++) {
                // log('!!!', i, scrollRecords[i], scrollRecords[i - 1], scrollRecords[i] !== scrollRecords[i - 1]);
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
    log('print to pdf', width, height, margin, html);
    // await scrollTo('top');
    // await scrollTo('bottom');
    const printStyle =
        '<style> /* normalize browsers */ html, body { margin: 0 !important; padding: 0 !important; } </style>' +
        '<style> /* page settings */ @page { size: ' + width + 'px ' + height + 'px; margin: ' + margin + 'px; } </style>' +
        '<style> div.page { width: ' + (width - margin * 2) + 'px; height: ' + (height - margin * 2) + 'px; } </style>';
    html = printStyle + html;

    // const document = unsafeWindow.document;
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

function generateHtmlFromPictures() {
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

function generateButton(buttonName, callback) {
    const $buttonPrint = document.createElement('button');
    $buttonPrint.innerText = buttonName;
    $buttonPrint.style = 'padding-left: 4px; padding-right: 4px;'
    $buttonPrint.onclick = () => {
        log('Triggered by', [buttonName], $buttonPrint);
        callback();
    }
    return $buttonPrint;
}

async function main() {
    function printPictures() {
        printToPdf(pageWidth, pageHeight, pageMargin, generateHtmlFromPictures());
    }
    document.getElementById('meta_content').appendChild(generateButton('Print Pictures', printPictures));
    document.getElementsByClassName('qr_code_pc')[0].appendChild(generateButton('Print Pictures', printPictures));
}

document.addEventListener('DOMContentLoaded', main);
