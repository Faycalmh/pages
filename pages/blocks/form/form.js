/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { emit } from '../../scripts/namespace.js';
import { loadCSS, readBlockConfig, toClassName } from '../../scripts/scripts.js';

export function setupForm({
  formId,
  formConfig,
  containerClass = 'form-container',
  preValidation = () => true,
}) {
  const { sheet, redirect } = formConfig;
  const $formContainer = document.querySelector(`.${containerClass}`);
  const $form = document.getElementById(formId);

  const emails = document.getElementsByClassName('emails');
  if (emails.length) {
  // legacy email checker
    for (let i = 0; i < emails.length; i += 1) {
      emails[i].addEventListener('change', () => {
        const email1 = document.getElementById('email');
        const email2 = document.getElementById('email2');
        const elements = document.getElementsByClassName('emailerror');
        if (email1.value !== email2.value) {
        // this tells the form to fail validation
          email1.setCustomValidity('Email fields must match.');
          elements.forEach((elem) => {
            elem.classList.remove('revealed');
          });
        } else {
          email1.setCustomValidity('');
          email2.setCustomValidity('');
          elements.forEach((elem) => {
            elem.classList.remove('revealed');
          });
        }
      });
    }
  } else {
    const $emails = Array.from($form.querySelectorAll('input[name=email]'));
    $emails.forEach(($email) => {
      $email.addEventListener('change', () => {
        const match = $emails.every(($e) => $emails[0].value === $e.value);
        const validity = match ? '' : 'Email fields must match.';
        $emails.forEach(($e) => {
          $e.setCustomValidity(validity);
          if (validity) $e.reportValidity();
        });
      });
    });
  }

  // $formContainer.parentElement.querySelectorAll('a').forEach(($a) => {
  //   if ($a.textContent.toLowerCase() === 'sheet') {
  //     sheet = $a.href;
  //     sheet = sheet.replace('%5C','') //temp fix for escaped &
  //     $a.parentElement.remove();
  //   }
  //   if ($a.textContent.toLowerCase() === 'thank you') {
  //     thankyou = $a.href;
  //     $a.parentElement.remove();
  //   }
  // });

  // default form urls
  const postURL = 'https://ccgrowth.servicebus.windows.net/formsink/messages';
  const postAuth = 'SharedAccessSignature sr=https%3A%2F%2Fccgrowth.servicebus.windows.net%2Fformsink%2Fmessages&sig=RFndMU%2FyHZrlchNBfHlIdulld4URAgUAQdAlqVLf1Bw%3D&se=1634259041&skn=send';
  const testURL = 'https://adobeioruntime.net/api/v1/web/helix-clients/ccgrowth/forms-handler@v1';

  // we validate the form ourselves. otherwise it would already validate on submit and we cannot
  // run the custom logic for the checkboxes.
  $form.setAttribute('novalidate', true);

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function randomString(min, max) {
    let len = Math.round(Math.random() * (max - min) + min);
    let s = '';
    while (len > 0) {
      s += String.fromCharCode(Math.random() * 26 + 97);
      len -= 1;
    }
    return s;
  }

  function randomize() {
    const email = `${randomString(4, 10)}@${randomString(4, 5)}.com`;
    const radios = {};
    $form.querySelectorAll('input, textarea').forEach(($f) => {
      if (!$f.name) {
        return;
      }
      if ($f.name === 'email' || $f.name === 'email2') {
        $f.value = email;
      }
      const type = $f.getAttribute('type');
      if (type === 'text') {
        $f.value = `${randomString(3, 10)} ${randomString(3, 10)}`;
      }
      if (type === 'radio') {
        if (!radios[$f.name]) {
          radios[$f.name] = true;
          const $els = $form.querySelectorAll(`input[name=${$f.name}]`);
          $els[Math.floor(Math.random() * $els.length)].checked = true;
        }
      }
      if (type === 'checkbox') {
        $f.checked = Math.random() > 0.5;
      }
    });
  }

  async function submit(uri = postURL, counter) {
    preValidation({ formEl: $form });
    if (!$form.reportValidity()) {
      return false;
    }
    if (!sheet) {
      console.error('No sheet url configured.');
      return false;
    }

    const values = [{
      name: 'timestamp',
      value: new Date().toISOString().replace(/[TZ]/g, ' ').split('.')[0].trim(),
    }];
    if (counter !== undefined) {
      values.push({
        name: 'counter',
        value: counter,
      });
    }
    $form.querySelectorAll('input, textarea, select').forEach(($f) => {
      if (!$f.name || $f.name === 'email2') {
      // skip email2
        return;
      }

      const type = $f.getAttribute('type');
      if ((type !== 'radio' && type !== 'checkbox') || $f.checked) {
        const existing = values.find((v) => v.name === $f.name);
        if (existing) {
        // add if not email confirmation
          if ($f.name !== 'email') {
            existing.value += `, ${$f.value}`;
          }
        } else {
          values.push({ name: $f.name, value: $f.value });
        }
      }
    });

    const body = { sheet, data: values };
    console.log('invoking', uri);

    const resp = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: postAuth,
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();

    console.log(values[0].value, `${counter}`, resp.status, text, body);
    return resp.status;
  }

  $form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    if (await submit()) {
      window.location = redirect;
    }
  });

  async function loadtest() {
    const NUM_POSTS = 50;
    const OFFSET = 0;
    for (let i = 1; i <= NUM_POSTS; i += 1) {
      randomize();
      // eslint-disable-next-line no-await-in-loop
      const status = await submit(postURL, i + OFFSET);
      if (status === 429) {
        console.log('sleeping for 5 seconds');
        // eslint-disable-next-line no-await-in-loop
        await sleep(5000);
        i -= 1;
      }
    }
  }

  async function setup() {
    if (testURL) {
      await submit(testURL, 0);
    } else {
      console.log('no test url configured');
    }
  }

  if (window.location.hash === '#formtools' && !document.getElementById('formtools')) {
    const createButton = (text, onClick) => {
      const $btn = document.createElement('button');
      $btn.addEventListener('click', onClick);
      $btn.append(document.createTextNode(text));
      return $btn;
    };
    const $tools = document.createElement('div');
    $tools.setAttribute('id', 'formtools');
    $tools.append(createButton('Randomize', randomize));
    $tools.append(createButton('Load Test', loadtest));
    $tools.append(createButton('Setup / Test', setup));
    $formContainer.append($tools);
  }
}

/**
   * @param {string} label
   * label = string of form input
   */
function inputSettings(label) {
  const visibleLabel = label;
  let cleanLabel = label;
  cleanLabel = label.indexOf(' ') >= 0 ? label.split(' ').join('-').toLowerCase() : label.toLowerCase();
  cleanLabel = label.indexOf('-*') >= 0 ? label.split('*')[0] : label;
  cleanLabel = label.indexOf('-(') >= 0 ? label.split('(')[0] : label;
  const settings = {
    label: visibleLabel,
    label_clean: cleanLabel,
    required: visibleLabel.indexOf('*') >= 0 ? 'required' : '',
  };
  return settings;
}

function csvOrLinesToArray(input) {
  if (input.includes('\n')) {
    return input.split('\n').map((o) => o.trim());
  } else {
    return input.split(',').map((o) => o.trim());
  }
}

function hideConditionals($form, $inputs, formData) {
  const values = $inputs.map(($i) => {
    if (($i.type === 'checkbox' || $i.type === 'radio') && !$i.checked) return null;
    return $i.value;
  });
  formData.forEach((item) => {
    if (item.show_if) {
      const showIfValues = csvOrLinesToArray(item.show_if);
      let match = false;
      showIfValues.forEach((val) => {
        if (values.includes(val)) match = true;
      });
      const qs = '.radio-el, .select-el, .input-el';
      const $div = $form.querySelector(`[name="${item.name}"]`).closest(qs);
      if (match) $div.classList.remove('hidden');
      else $div.classList.add('hidden');
    }
  });
}

async function createForm({
  formEl,
  formId,
  formData,
  hasPageBreak,
}) {
  let formField = '';
  let formSubmitPresent = false;
  let progressLabel = '';

  formData.forEach((item, index) => {
    const setup = inputSettings(item.label);
    const name = item.name ? item.name : setup.label_clean;
    const required = item.required ? item.required : setup.required;
    const description = hasPageBreak && item.description.length > 0 ? `<span class="description-title" tabindex="0">${item.description}</span>` : '';

    if (item.type === 'indicator') {
      progressLabel = item.label;
    }

    let placeholder = !!item.placeholder;

    if (placeholder) {
      if (item.placeholder.length > 3) {
        placeholder = `${item.placeholder}`;
      } else {
        placeholder = '';
      }
    } else {
      placeholder = '';
    }

    if (index === 0 && hasPageBreak) {
      formField += `
        <div class="slide-form-container">
          <div class="slide-form-item active">
              `;
    }

    // INPUT TEXT || EMAIL
    if (item.type === 'text' || item.type === 'email') {
      formField += `
        <div class="input-el question is-${required}">
          <div class="title-el">
            <label class="label-title" for="${name}" tabindex="0">${setup.label}</label>
            ${description}
          </div>
          <input type="${item.type}" name="${name}" placeholder="${placeholder}" ${required}/>
        </div>
        `;
    }

    // RADIO INPUTS
    if (item.type.includes('radio')) {
      const optionsAll = csvOrLinesToArray(item.options);
      let radioOption = '';

      optionsAll.forEach((option) => {
        const cleanOptionName = toClassName(option);
        const id = `${name}-${cleanOptionName}`;
        const value = option.replace('"', '');

        radioOption += `
          <div class="radio-option">
            <input type="radio" id="${id}" name="${name}" value="${value}" ${required}/>
            <label for="${id}">${option}</label>
          </div>
        `;
      });
      formField += `
          <div class="radio-el question is-${required}">
            <div class="title-el">
              <span class="label-title" tabindex="0">${item.label}</span>
              ${description}
            </div>
            <div class="radio-options-parent">
              ${radioOption}
            </div>
          </div>
        `;
    }

    // CHECKBOXES
    if (item.type === 'checkbox') {
      const checkboxOptions = csvOrLinesToArray(item.options);
      let options = '';
      checkboxOptions.forEach((option) => {
        const cleanOptionName = toClassName(option);
        const id = `${name}-${cleanOptionName}`;
        const value = option.replace('"', '');

        options += `
            <div class="radio-option">
              <input type="checkbox" 
                id="${id}" 
                name="${name}"
                value="${value}"
              />
              <label for="${id}">${option}</label>
            </div>
          
          `;
      });
      formField += `
          <div class="input-el checkboxes ${required} question is-${required}">
            <div class="title-el">
              <span class="label-title" tabindex="0">${item.label}</span>
              ${description}
            </div>
            ${options}
          </div>
        `;
    }

    // SELECT
    if (item.type === 'select') {
      const selectOptions = csvOrLinesToArray(item.options);
      let options = '';
      selectOptions.forEach((option) => {
        options += `
            <option>${option}</option>
          `;
      });
      formField += `
          <div class="select-el question is-${required}">
            <div class="title-el">
              <label class="label-title" for="${name}" tabindex="0">${item.label}</label>
              ${description}  
            </div>
            <select name="${name}" id="${name}">
              ${options}
            </select>
          </div>
        `;
    }

    // TEXTAREA
    if (item.type === 'textarea') {
      formField += `
          <div class="text-el question is-${required}">
            <div class="title-el">
              <label class="label-title" for="${name}" tabindex="0">${item.label}</label>
              ${description}
            </div>
            <textarea
              name="${name}"
              cols="30"
              rows="5"
              placeholder="${placeholder}"
              ${required}
            ></textarea>
          </div>
        `;
    }

    // TEXTAREA
    if (item.type === 'title') {
      formField += `
          <div class="text-el question is-${required}">
            <div class="title-el">
              <label class="label-title" for="${name}" tabindex="0">${item.label}</label>
              ${description}
            </div>
            <hr>
          </div>
        `;
    }

    if (item.type === 'page-break' && hasPageBreak) {
      formField += '</div> <div class=\'slide-form-item\'>';
    }

    if (index === formData.length - 1 && hasPageBreak) {
      formField += '</div></div>';
    }

    // Submit Button
    if (item.type === 'submit' && !hasPageBreak) {
      formField += `
          <div class="submit-el">
            <button type="submit">${item.label}</button>
          </div>
        `;
      formSubmitPresent = true;
    }
  });

  if (!formSubmitPresent && !hasPageBreak) {
    formField += `
      <div class="submit-el">
        <button type="submit">Submit</button>
      </div>`;
  }
  formEl.innerHTML = formField;

  if (hasPageBreak) {
    const slidePanelParent = document.createElement('div');
    const buttonParent = document.createElement('div');
    buttonParent.className = 'panel button-panel';
    slidePanelParent.className = 'panel progress-indicator-group';

    slidePanelParent.innerHTML = `
        <div class="panel__item panel-tab" tabindex="0">
          <div class="indicator">
            <div class="progress-label">
              <div class="progress-name">
                ${progressLabel}
              </div>
              <div class="indicator-crumb">
                <span class="indicator-current">Page 1</span>
                <span>/</span>
                <span class="indicator-total">0</span>
              </div>
            </div>
            <div class="progress-indicator">
              <span></span>
            </div>  
          </div>
        </div>`;

    buttonParent.innerHTML = `
        <div class="panel__item">
          <div class="form-sliders-btns">
            <button class="slide-btn prev" type="button">Back</button>
            <button class="slide-btn next" type="button">Next</button>
            <button type="submit" class="submit" style='display: none;'>Submit</button>
          </div>
        </div>
        
        `;
    formEl.prepend(slidePanelParent);
    formEl.appendChild(buttonParent);
  }

  // show_if
  const showIfTypes = ['select', 'input[type=radio]', 'input[type=checkbox]'];
  const qs = showIfTypes.map((t) => `#${formId} ${t}`).join(',');
  const $inputs = Array.from(document.querySelectorAll(qs));
  $inputs.forEach(($input) => {
    $input.addEventListener('change', () => {
      hideConditionals(formEl, $inputs, formData);
    });
  });
  hideConditionals(formEl, $inputs, formData);
}

function customValidate({ formEl }) {
  const qs = '.radio-el.hidden, .select-el.hidden, .input-el.hidden';
  const $hiddenEls = formEl.querySelectorAll(qs);
  $hiddenEls.forEach(($div) => {
    $div.querySelectorAll('[required]').forEach(($r) => {
      $r.removeAttribute('required');
    });
  });

  const $requiredCheckboxes = formEl.querySelectorAll('.checkboxes.required');
  $requiredCheckboxes.forEach(($div) => {
    if (!$div.classList.contains('hidden') && !$div.querySelector('input:checked')) {
      // needs to be filled in
      $div.querySelector('input[type=checkbox]').setCustomValidity('Please select at least one checkbox.');
    } else {
      $div.querySelector('input[type=checkbox]').setCustomValidity('');
    }
  });
}

async function fetchFormData(definition) {
  const resp = await fetch(`${definition}.json`);
  const json = await resp.json();
  window.hlx.dependencies.push(`${definition}.json`);
  emit('form:fetchData', json);
  return json;
}

function readEmbeddedFormConfig($block) {
  const config = {};

  // contains the block and any other sibling elements
  const $commonRoot = $block.parentNode.parentNode.parentNode;
  $commonRoot.querySelectorAll(':scope>p').forEach(($p) => {
    let name;
    let value;
    const text = $p.textContent.toLowerCase();
    if (text.includes('<form:')) {
      // <form: TYPE>
      name = 'form-definition';
      value = text.split('<form: ')[1].split('>')[0].trim();
    } else {
      // <a href=URL>Sheet OR Thank You</a>
      const $a = $p.querySelector(':scope>a');
      if ($a) {
        name = toClassName(text);
        value = $a.href;
      }
    }
    config[name] = value;
    $p.remove();
  });
  return config;
}

function readFormConfig($block) {
  let config = readBlockConfig($block);
  if (Object.keys(config).length === 0) {
    // If that didn't work, try loading it
    // as component that was converted to a block
    config = readEmbeddedFormConfig($block);
  }

  config = {
    sheet: config['form-data-submission'] || config.sheet,
    redirect: config['form-redirect'] || config['thank-you'] || 'thank-you',
    definition: config['form-definition'] || 'default',
  };
  emit('form:readConfig', config);
  return config;
}

/** @type {import('../block.js').BlockDecorator} */
export default async function decorate($block) {
  $block.innerHTML = `
  <div class="wg-form-container form-container">
    <form id="wg-form">
      <div class="wg-form-loader">
        <div class="wg-form-loader__indicator"></div>
      <div>
    </form>
  </div>`;

  const formId = 'wg-form';

  const mainEl = document.querySelector('main');
  const formEl = document.getElementById(formId);

  const formConfig = readFormConfig($block);
  const { definition } = formConfig;
  let hasPageBreak = false;

  // Hide sheet and thank you link from page while loading...
  mainEl.style.opacity = '0';

  const formData = (await fetchFormData(definition)).data;
  // check if slider
  for (const item of formData) {
    if (item.type === 'page-break') {
      hasPageBreak = true;
      break;
    }
  }

  await createForm({
    ...formConfig,
    formId,
    formEl,
    formData,
    hasPageBreak,
  });
  mainEl.style.opacity = '1';
  document.querySelectorAll('main')[0].style.opacity = '1';

  if (hasPageBreak) {
    await import('./slide-form.js');
    loadCSS('./slide-form.css');
  }

  setupForm({
    formId,
    formConfig,
    preValidation: customValidate,
  });
}
