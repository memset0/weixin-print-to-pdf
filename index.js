// ==UserScript==
// @name         微信公众号 PDF 导出脚本
// @namespace    mem.ac/weixin-print-to-pdf
// @version      1.0.1
// @description  方便地导出公众号文章中以图片形式上传的试题，方便您一键开卷！
// @author       memset0
// @match        https://mp.weixin.qq.com/s/*
// @updateUrl    https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @downloadUrl  https://cdn.jsdelivr.net/gh/memset0/weixin-print-to-pdf/index.js
// @run-at       document-start
// ==/UserScript==

const scrollSpeed = 50;

function log(...args) {
    console.log('[@memset0/weixin-print-to-pdf]', ...args);
}

function transferHtmlToPdf(htmlSource) {
    // const document = unsafeWindow.document;
    const blob = new Blob([htmlSource], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    log(blobUrl);

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

async function printToPdf() {
    const width = 210;
    const height = 297;
    const margin = 0;

    // await scrollTo('top');
    // await scrollTo('bottom');
    
    let html = '';

    // normalize browser
    html += '<style> html, body { margin: 0 !important; padding: 0 !important; } </style>'

    // style of page containers
    html += '<style>' +
        'div.page { page-break-after: always; display: flex; justify-content: center; align-items: center; }' +
        'div.page>img { max-width: 100%; max-height: 100%; }' +
        '</style>';

    // page settings
    html += '<style> @page { size: ' + width + 'px ' + height + 'px; margin: ' + margin + 'px; } </style>';
    html += '<style> div.page { width: ' + (width - margin * 2) + 'px; height: ' + (height - margin * 2) + 'px; } </style>'
    console.log(html);

    for (const $image of document.getElementById('js_content').querySelectorAll('img')) {
        const imageSrc = $image.getAttribute('data-src');
        if (!imageSrc) { continue; }
        html += '<div class="page"><img src="' + imageSrc + '"></div>';
        // log(imageSrc);
    }

    // log(html);
    transferHtmlToPdf(html);

    log('Printed!');
}

function initizePrintButton() {
    function generatePrintButton(buttonName) {
        const $buttonPrint = document.createElement('button');
        $buttonPrint.innerText = 'Print to PDF'
        $buttonPrint.style = 'padding-left: 4px; padding-right: 4px;'
        $buttonPrint.onclick = () => {
            log('Triggered by', buttonName);
            printToPdf();
        }
        return $buttonPrint;
    }
    document.getElementById('meta_content').appendChild(generatePrintButton());
    document.getElementsByClassName('qr_code_pc')[0].appendChild(generatePrintButton());
}

async function main() {
    initizePrintButton();
}

document.addEventListener('DOMContentLoaded', main);
