// ==UserScript==
// @name                微信公众号 PDF 导出脚本
// @namespace           mem.ac/weixin-print-to-pdf
// @version             1.5.1
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
    .mem-print-settings {
        margin: auto;
        padding: 16px;
    }
    .mem-print-settings-btn-group button {
        margin-right: 6px;
    }
    .mem-print-filter-applied {
        background: red;
    }
    #mem-print-main {
        line-height: 0px;
        margin-bottom: 20px;
        /* padding: 16px;
        border: 1px solid #D9DADC; */
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
                for (let i = +splited[0] - 1; i < +splited[1]; i++) {
                    if (i < 0 || i >= flag.length) {
                        return illegalFilter('out of range');
                    }
                    flag[i] = true;
                }
            } else {
                if (!isInteger(filter)) {
                    return illegalFilter('not a number');
                }
                const x = +filter - 1;
                if (x < 0 || x >= flag.length) {
                    return illegalFilter('out of range');
                }
                flag[x] = true;
            }
        }
    }
    log('apply filter:', filter, flag, iterable);
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

async function printToPdf(options, html) {
    const { width, height, margin } = options;
    log('print to pdf', width, height, margin);
    // await scrollTo('top');
    // await scrollTo('bottom');
    const pixeledMargin = String(margin).split(' ').map((s) => (s + 'px')).join(' ');
    const printStyle =
        '<style> /* normalize browsers */ html, body { margin: 0 !important; padding: 0 !important; } </style>' +
        '<style> /* page settings */ @page { size: ' + width + 'px ' + height + 'px; margin: ' + pixeledMargin + '; } </style>' +
        '<style> div.page { width: ' + (width - margin * 2) + 'px; height: ' + (height - margin * 2) + 'px; } </style>';
    html = printStyle + html;

    const { zoom } = options;
    if (+zoom !== 1) {
        html += '<style>body { zoom: ' + zoom + '; }</style>';
    }

    const { customJS, customCSS } = options;
    if (customJS) {
        html += '\n\n\n<!-- Custom JS --><script>' + customCSS + '</script>\n\n\n';
    }
    if (customCSS) {
        html += '\n\n\n<!-- Custom CSS --><style>' + customCSS + '</style>\n\n\n';
    }

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

function generateHtmlFromContent(options) {
    let html = '';
    for (const $element of applyFilter(document.getElementById('js_content').children, options.filter)) {
        console.log($element);
        html += $element.outerHTML + '\n\n';
    }
    return html;
}

function generateHtmlFromPictures(options) {
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
    createElement() {
        this.$inputs = {};

        const $dialog = document.createElement('dialog');
        $dialog.innerHTML = '<h1 class="mem-print-settings-title">Settings</h1>';
        $dialog.className = 'mem-print-settings';

        for (const name of Object.keys(this.defaults)) {
            const $label = document.createElement('label');
            const $input = document.createElement('input');
            this.$inputs[name] = $input;

            $label.innerText = name;
            if (this.defaults[name] !== '') {
                $label.innerText += '(default: ' + this.defaults[name] + ')'
            }
            $label.innerText += ':  ';

            $input.name = name;
            $input.value = this.data[name];
            $input.onblur = (event) => {
                log('update', $input.name, $input.value);
                this.updates[$input.name] = $input.value;
            };

            $label.appendChild($input);
            $dialog.appendChild($label);
            $dialog.appendChild(document.createElement('br'));
        }

        const $btnGroup = document.createElement('div');
        $btnGroup.className = 'mem-print-settings-btn-group';
        $dialog.appendChild($btnGroup);

        const $resetButton = document.createElement('button');
        $resetButton.innerText = 'Reset';
        $resetButton.name = 'reset';
        $resetButton.onclick = () => this.closeWindow(this.defaults);
        $btnGroup.appendChild($resetButton);

        const $cancelButton = document.createElement('button');
        $cancelButton.innerText = 'Cancel';
        $cancelButton.name = 'cancel';
        $cancelButton.onclick = () => this.closeWindow({});
        $btnGroup.appendChild($cancelButton);

        const $submitButton = document.createElement('button');
        $submitButton.innerText = 'Submit';
        $submitButton.name = 'submit';
        $submitButton.onclick = () => this.closeWindow(this.updates);
        $btnGroup.appendChild($submitButton);

        return $dialog;
    }

    openWindow() {
        this.updates = {};
        for (const name in this.$inputs) {
            // log('dialog open:', name, this.data[name], this.$inputs[name].value);
            this.$inputs[name].value = this.data[name];
        }
        this.$element.showModal();
    }

    closeWindow(update = null) {
        if (update && Object.keys(update).length) {
            for (const key in update) {
                this.data[key] = update[key];
            }
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        }
        log('dialog closed:', update, this.data);
        this.$element.close();
    }

    constructor(storageKey = 'mem-print-settings') {
        this.storageKey = storageKey;
        this.data = {};
        this.defaults = {
            // Page Settings
            width: 797,   // A4 8.3inch * 11.7inch
            height: 1123,
            margin: 0,
            zoom: 1,
            // Element filters
            filter: '',
            // Custom style,
            customJS: '',
            customCSS: '',
        };
        if (localStorage.getItem(storageKey)) {
            const storaged = localStorage.getItem(storageKey);
            if (storaged) {
                this.data = JSON.parse(storaged);
            }
        }
        for (const key in this.defaults) {
            if (!Object.keys(this.data).includes(key)) {
                this.data[key] = this.defaults[key];
            }
        }

        this.$element = this.createElement();
        document.body.appendChild(this.$element);
        if (typeof this.$element.showModal !== 'function') {
            this.$element.hidden = true;
            alert('Your browser doesn\'t support <dialog>, settings may not work.')
        }
    }
}

function renderFilter() {

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
        printToPdf(settings.data, generateHtmlFromContent(settings.data));
    }
    $mainContainer.appendChild(generateButton('Print Content', printContent));
    $sideContainer.appendChild(generateButton('Print Content', printContent));

    printPictures = () => {
        printToPdf(settings.data, generateHtmlFromPictures(settings.data));
    };
    $mainContainer.appendChild(generateButton('Print Pictures', printPictures));
    $sideContainer.appendChild(generateButton('Print Pictures', printPictures));

    // previewFilters = () => {
    //     renderFilter();
    // };
    // $mainContainer.appendChild(generateButton('Preview Filters', previewFilters));
    // $sideContainer.appendChild(generateButton('Preview Filters', previewFilters));

    $mainContainer.appendChild(generateButton('Settings', () => { settings.openWindow(); }));
    $sideContainer.appendChild(generateButton('Settings', () => { settings.openWindow(); }));
}

document.addEventListener('DOMContentLoaded', main);
