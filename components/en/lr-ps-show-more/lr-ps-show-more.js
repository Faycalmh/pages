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
import { hashPathOf } from '../../../pages/scripts/static-media.js';

async function fetchSteps() {
  window.hlx.dependencies.push('steps.json');
  const resp = await fetch('steps.json');
  const json = await resp.json();
  return (Array.isArray(json) ? json : json.data);
}

async function getImageURL(pathOrURL) {
  if (pathOrURL.startsWith('https://')) {
    return pathOrURL;
  }
  return hashPathOf(`/static/lr-ps/hero-posters/${pathOrURL}`);
}

async function filterSteps() {
  const steps = await fetchSteps();

  const currentIndex = window.location.search.split('?')[1].split('&')[0] - 1;
  const currentTag = steps[currentIndex].Tag;
  const urlBase = `${window.location.href.split('?')[0]}`;

  const proms = steps
    .filter(({ Tag }, i) => Tag === currentTag && i !== currentIndex)
    .map(async ({
      Title,
      Description,
      Thumbnail,
    }, i) => `
      <a class="more-content--ete-item" href="${urlBase}?${i + 1}">
        <div class="more-content--ete-image">
          <div style="position: relative;">
            <img src="${await getImageURL(Thumbnail)}">
          </div>
        </div>
        <div class="more-content--ete-details">
          <h4>${Title.split('&nbsp;').join('')}</h4>
          <p>${Description}</p>
        </div>
      </a>
    `);
  Promise.all(proms)
    .then((segments) => {
      document.querySelector('.more-content--ete-inner').innerHTML = segments.join('');
    });
}

async function setUpFiles() {
  const steps = await fetchSteps();
  const currentIndex = window.location.search.split('?')[1].split('&')[0];
  const index = currentIndex - 1;
  const currentData = steps[index];
  let file = '';
  const allFiles = [
    {
      fileType: currentData.Practice_File_Title,
      fileDownload: currentData.Practice_File_File,
    },
    {
      fileType: currentData.File_Title_One,
      fileDownload: currentData.File_Title_Url_One,
    },
    {
      fileType: currentData.File_Title_Two,
      fileDownload: currentData.File_Title_Url_Two,
    },
    {
      fileType: currentData.File_Title_Three,
      fileDownload: currentData.File_Title_Url_Three,
    },
    {
      fileType: currentData.File_Title_Four,
      fileDownload: currentData.File_Title_Url_Four,
    },
  ];

  for (let i = 0; i < allFiles.length; i += 1) {
    const buttonText = i < 1 ? 'Download' : 'Open';
    if (allFiles[i].fileType.length > 2) {
      let svg = allFiles[i].fileType.toLowerCase().split(' ').join('');

      if (svg === 'premierepro') {
        svg = 'premiere';
      }

      if (svg === 'adobefonts') {
        svg = 'fonts';
      }

      file += `
          <div class="file-ete--item">
            <div class="file_image-ete">
              <img src="/icons/${svg}.svg">
            </div>
            <div class="file_name-ete">
              <h4>${allFiles[i].fileType}</h4>
              <div class="download--ete">
                <a href="${allFiles[i].fileDownload}" target="_blank">${buttonText}</a>
              </div>
            </div>
          </div>
        `;
    }
  }

  document.querySelector('.files-ete').innerHTML = file;
}

/** @type {import("../block").BlockDecorator} */
export default function decorate($block) {
  $block.innerHTML = `
<div class="must-haves">
  <div class="must-haves__inner">
    <h3 class="must-haves__title">Tutorials must-haves</h3>
    <p class="must-haves__copy">Follow along with the tutorial workflow on your desktop.</p>
    <div class="files-ete">
      <!-- Files here -->
    </div>
  </div>
</div>


<div class="more-content--ete">
  <h3 class="section-title--ete-more">Let's keep creating.</h3>
  <div class="more-content--ete-inner">
    <!-- mark up -->
  </div>

  <div class="see-all-tutorials--ete">
    <a href="https://pages.adobe.com/creativecloud/en/lr-and-ps-together/">See all tutorials</a>
  </div>
</div>`;

  filterSteps();
  setUpFiles();
}
