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

import {
  insertAfter,
} from '../block-helpers.js';

// eslint-disable-next-line no-unused-vars
export default function decorate($block) {
  const $separator = $block.querySelector(':scope > div:first-of-type');
  $separator.classList.add('container');
  const $otherCells = Array.from($block.querySelectorAll(':scope > div:not(:first-of-type)'));
  $otherCells.forEach(($cell) => {
    if ($cell) {
      insertAfter($cell, $block);
    }
  });
}
