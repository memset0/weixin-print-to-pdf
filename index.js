// ==UserScript==
// @name                微信公众号 PDF 导出脚本
// @namespace           mem.ac/weixin-print-to-pdf
// @version             1.3.1
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

const pageZoom = 1;

const pageMargin = 0;

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

function scrollTo(type) {
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
    log('print to pdf', width, height, margin, html);
    // await scrollTo('top');
    // await scrollTo('bottom');
    const printStyle =
        '<style> /* normalize browsers */ html, body { margin: 0 !important; padding: 0 !important; } </style>' +
        '<style> /* page settings */ @page { size: ' + width + 'px ' + height + 'px; margin: ' + margin + 'px; } </style>' +
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

    $mainContainer = generateDiv('mem-print-main', 'mem-print-container');
    $sideContainer = generateDiv('mem-print-side', 'mem-print-container');

    $style = document.createElement('style');
    $style.innerHTML = CSS;
    $mainContainer.appendChild($style);

    document.getElementsByClassName('qr_code_pc')[0].appendChild($sideContainer);
    document.getElementById('img-content').parentNode.insertBefore($mainContainer, document.getElementById('img-content'));
    console.log($mainContainer, $sideContainer);

    printContent = () => {
        printToPdf(pageWidth, pageHeight, pageMargin, generateHtmlFromContent());
    }
    $mainContainer.appendChild(generateButton('Print Content', printContent));
    $sideContainer.appendChild(generateButton('Print Content', printContent));

    printPictures = () => {
        printToPdf(pageWidth, pageHeight, pageMargin, generateHtmlFromPictures());
    };
    $mainContainer.appendChild(generateButton('Print Pictures', printPictures));
    $sideContainer.appendChild(generateButton('Print Pictures', printPictures));
}

document.addEventListener('DOMContentLoaded', main);
