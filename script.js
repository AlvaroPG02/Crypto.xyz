const form = document.querySelector("#cryptoForm");
const downloadExcel = document.querySelector("#downloadExcel");
const plainText = document.querySelector("#plainText");
const method = document.querySelector("#method");
const methodTrigger = document.querySelector("#methodTrigger");
const methodTriggerName = document.querySelector("#methodTriggerName");
const methodPopover = document.querySelector("#methodPopover");
const methodOptions = document.querySelectorAll(".method-option");
const alphabet = document.querySelector("#alphabet");
const shift = document.querySelector("#shift");
const keyword = document.querySelector("#keyword");
const keywordTwo = document.querySelector("#keywordTwo");
const alphabetField = document.querySelector("#alphabetField");
const alphabetHint = document.querySelector("#alphabetHint");
const shiftField = document.querySelector("#shiftField");
const keywordField = document.querySelector("#keywordField");
const keywordTwoField = document.querySelector("#keywordTwoField");
const keywordHint = document.querySelector("#keywordHint");
const methodHint = document.querySelector("#methodHint");
const result = document.querySelector("#result");
const resultMode = document.querySelector("#resultMode");
const decryptedResult = document.querySelector("#decryptedResult");
const decryptMode = document.querySelector("#decryptMode");
const decryptHint = document.querySelector("#decryptHint");
const matrixCard = document.querySelector("#matrixCard");
const matrixTitle = document.querySelector("#matrixTitle");
const matrixSize = document.querySelector("#matrixSize");
const matrixView = document.querySelector("#matrixView");
const stepsBody = document.querySelector("#stepsBody");
const stepCount = document.querySelector("#stepCount");
let currentReport = null;

const hints = {
  caesar: "Ideal para ver una sustitucion alfabetica sencilla.",
  vigenere: "Muestra como una clave puede cambiar cada paso del cifrado.",
  xor: "El resultado se muestra en hexadecimal para que sea legible.",
  playfair: "Usa una matriz 5x5; numeros y simbolos se conservan.",
  autoclave: "Usa una clave inicial y despues continua con el propio texto.",
  "four-square": "Usa cuatro matrices; en español incluye A-Z, Ñ y los numeros 0-8."
};

const alphabets = {
  spanish: {
    letters: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
    playfairLetters: "ABCDEFGHIKLMNOPQRSTUVWXYZ",
    playfairColumns: 5,
    fourSquareLetters: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ012345678",
    fourSquareColumns: 6,
    label: "Español"
  },
  english: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    playfairLetters: "ABCDEFGHIKLMNOPQRSTUVWXYZ",
    playfairColumns: 5,
    fourSquareLetters: "ABCDEFGHIKLMNOPQRSTUVWXYZ",
    fourSquareColumns: 5,
    label: "Ingles"
  }
};

function getAlphabetConfig() {
  return alphabets[alphabet.value] || alphabets.spanish;
}

function normalizeBaseLetter(char) {
  return char
    .replaceAll("ñ", "__enie_lower__")
    .replaceAll("Ñ", "__enie_upper__")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("__enie_lower__", "ñ")
    .replaceAll("__enie_upper__", "Ñ")
    .toLocaleUpperCase("es-ES");
}

function isLetter(char) {
  const normalized = normalizeBaseLetter(char);
  return alphabets.spanish.letters.includes(normalized);
}

function isLetterInAlphabet(char, config = getAlphabetConfig()) {
  return config.letters.includes(normalizeBaseLetter(char));
}

function isLowerLetter(char) {
  return char === char.toLocaleLowerCase("es-ES") && char !== char.toLocaleUpperCase("es-ES");
}

function normalizeShift(value, config = getAlphabetConfig()) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return ((parsed % config.letters.length) + config.letters.length) % config.letters.length;
}

function shiftChar(char, amount, config = getAlphabetConfig()) {
  const normalized = normalizeBaseLetter(char);
  const original = config.letters.indexOf(normalized);
  const shifted = (original + amount) % config.letters.length;
  const shiftedChar = config.letters[shifted];
  return {
    char: isLowerLetter(char) ? shiftedChar.toLocaleLowerCase("es-ES") : shiftedChar,
    originalPosition: original,
    shiftedPosition: shifted
  };
}

function toCodeLabel(char) {
  if (char === " ") {
    return "espacio";
  }
  if (char === "\n") {
    return "\\n";
  }
  if (char === "\t") {
    return "\\t";
  }
  return char;
}

function toHex(value) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function cleanKeyword(value, config = getAlphabetConfig()) {
  return value
    .split("")
    .filter((char) => isLetterInAlphabet(char, config))
    .map(normalizeBaseLetter)
    .join("");
}

function normalizeFourSquareChar(char) {
  const normalized = normalizeBaseLetter(char);
  return alphabet.value === "english" && normalized === "J" ? "I" : normalized;
}

function isFourSquareChar(char, config = getAlphabetConfig()) {
  return config.fourSquareLetters.includes(normalizeFourSquareChar(char));
}

function buildKeyedMatrix(key, sourceAlphabet, columns, normalizeChar) {
  const letters = [];
  const seen = new Set();
  const source = `${key}${sourceAlphabet}`;

  [...source].forEach((char) => {
    const normalized = normalizeChar(char);
    if (!seen.has(normalized) && sourceAlphabet.includes(normalized)) {
      seen.add(normalized);
      letters.push(normalized);
    }
  });

  const matrix = [];
  const positions = {};
  const rows = Math.ceil(sourceAlphabet.length / columns);
  for (let row = 0; row < rows; row += 1) {
    matrix[row] = letters.slice(row * columns, row * columns + columns);
    matrix[row].forEach((letter, column) => {
      positions[letter] = { row, column };
    });
  }

  return { columns, matrix, positions };
}

function normalizePlayfairLetter(char, config = getAlphabetConfig()) {
  const normalized = normalizeBaseLetter(char);
  if (alphabet.value === "spanish" && normalized === "Ñ") {
    return "N";
  }
  return normalized === "J" ? "I" : normalized;
}

function buildPlayfairMatrix(key, config = getAlphabetConfig()) {
  const playfairLetters = config.playfairLetters || config.letters;
  return buildKeyedMatrix(key || "clave", playfairLetters, config.playfairColumns, (char) => normalizePlayfairLetter(char, config));
}

function preparePlayfairPairs(text, config = getAlphabetConfig()) {
  const letters = [...text]
    .map((char, sourceIndex) => ({ letter: normalizePlayfairLetter(char, config), sourceIndex }))
    .filter((token) => isLetterInAlphabet(token.letter, config) || config.playfairLetters.includes(token.letter));
  const pairs = [];
  let index = 0;

  while (index < letters.length) {
    const first = letters[index];
    const second = letters[index + 1];

    if (!second) {
      pairs.push([first, { letter: "X", sourceIndex: null }]);
      index += 1;
    } else if (first.letter === second.letter) {
      pairs.push([first, { letter: "X", sourceIndex: null }]);
      index += 1;
    } else {
      pairs.push([first, second]);
      index += 2;
    }
  }

  return pairs;
}

function preparePlayfairDecryptPairs(text, config = getAlphabetConfig()) {
  const letters = [...text]
    .map((char, sourceIndex) => ({ letter: normalizePlayfairLetter(char, config), sourceIndex }))
    .filter((token) => config.playfairLetters.includes(token.letter));
  const pairs = [];

  for (let index = 0; index < letters.length; index += 2) {
    if (letters[index + 1]) {
      pairs.push([letters[index], letters[index + 1]]);
    }
  }

  return pairs;
}

function encryptCaesar(text, amount, config = getAlphabetConfig()) {
  const steps = [];
  let encrypted = "";

  [...text].forEach((char, index) => {
    if (!isLetterInAlphabet(char, config)) {
      encrypted += char;
      steps.push({
        index,
        original: toCodeLabel(char),
        value: "Sin desplazamiento",
        operation: "No es letra: se conserva igual",
        encrypted: toCodeLabel(char)
      });
      return;
    }

    const shifted = shiftChar(char, amount, config);
    encrypted += shifted.char;
    steps.push({
      index,
      original: char,
      value: `Desplazamiento ${amount}`,
      operation: `${shifted.originalPosition} + ${amount} = ${shifted.originalPosition + amount} -> ${shifted.shiftedPosition} mod ${config.letters.length}`,
      encrypted: shifted.char
    });
  });

  return { encrypted, steps };
}

function encryptVigenere(text, key, config = getAlphabetConfig()) {
  const normalizedKey = cleanKeyword(key, config) || "CLAVE";
  const steps = [];
  let encrypted = "";
  let letterIndex = 0;

  [...text].forEach((char, index) => {
    if (!isLetterInAlphabet(char, config)) {
      encrypted += char;
      steps.push({
        index,
        original: toCodeLabel(char),
        value: "Clave no avanza",
        operation: "No es letra: se conserva igual",
        encrypted: toCodeLabel(char)
      });
      return;
    }

    const keyChar = normalizedKey[letterIndex % normalizedKey.length];
    const keyShift = config.letters.indexOf(keyChar);
    const shifted = shiftChar(char, keyShift, config);
    encrypted += shifted.char;
    steps.push({
      index,
      original: char,
      value: `Clave "${keyChar}" = ${keyShift}`,
      operation: `${shifted.originalPosition} + ${keyShift} = ${shifted.originalPosition + keyShift} -> ${shifted.shiftedPosition} mod ${config.letters.length}`,
      encrypted: shifted.char
    });
    letterIndex += 1;
  });

  return { encrypted, steps };
}

function decryptVigenere(text, key, config = getAlphabetConfig()) {
  const normalizedKey = cleanKeyword(key, config) || "CLAVE";
  let decrypted = "";
  let letterIndex = 0;

  [...text].forEach((char) => {
    if (!isLetterInAlphabet(char, config)) {
      decrypted += char;
      return;
    }

    const keyChar = normalizedKey[letterIndex % normalizedKey.length];
    const keyShift = config.letters.indexOf(keyChar);
    decrypted += shiftChar(char, config.letters.length - keyShift, config).char;
    letterIndex += 1;
  });

  return decrypted;
}

function getAutoclaveStream(text, key, config = getAlphabetConfig()) {
  const keyLetters = cleanKeyword(key, config) || "CLAVE";
  const textLetters = [...text]
    .filter((char) => isLetterInAlphabet(char, config))
    .map(normalizeBaseLetter)
    .join("");

  return `${keyLetters}${textLetters}`;
}

function encryptAutoclave(text, key, config = getAlphabetConfig()) {
  const stream = getAutoclaveStream(text, key, config);
  const steps = [];
  let encrypted = "";
  let letterIndex = 0;

  [...text].forEach((char, index) => {
    if (!isLetterInAlphabet(char, config)) {
      encrypted += char;
      steps.push({
        index,
        original: toCodeLabel(char),
        value: "Clave no avanza",
        operation: "No es letra: se conserva igual",
        encrypted: toCodeLabel(char)
      });
      return;
    }

    const keyChar = stream[letterIndex];
    const keyShift = config.letters.indexOf(keyChar);
    const shifted = shiftChar(char, keyShift, config);
    encrypted += shifted.char;
    steps.push({
      index,
      original: char,
      value: `Autoclave "${keyChar}" = ${keyShift}`,
      operation: `${shifted.originalPosition} + ${keyShift} = ${shifted.originalPosition + keyShift} -> ${shifted.shiftedPosition} mod ${config.letters.length}`,
      encrypted: shifted.char
    });
    letterIndex += 1;
  });

  return { encrypted, steps };
}

function decryptAutoclave(text, key, config = getAlphabetConfig()) {
  const initialKey = cleanKeyword(key, config) || "CLAVE";
  const recoveredLetters = [];
  let decrypted = "";
  let letterIndex = 0;

  [...text].forEach((char) => {
    if (!isLetterInAlphabet(char, config)) {
      decrypted += char;
      return;
    }

    const keyChar = letterIndex < initialKey.length
      ? initialKey[letterIndex]
      : recoveredLetters[letterIndex - initialKey.length];
    const keyShift = config.letters.indexOf(keyChar);
    const decoded = shiftChar(char, config.letters.length - keyShift, config).char;
    decrypted += decoded;
    recoveredLetters.push(normalizeBaseLetter(decoded));
    letterIndex += 1;
  });

  return decrypted;
}

function encryptXor(text, key) {
  const safeKey = key || "key";
  const steps = [];
  const encryptedBytes = [];

  [...text].forEach((char, index) => {
    const keyChar = safeKey[index % safeKey.length];
    const charCode = char.charCodeAt(0);
    const keyCode = keyChar.charCodeAt(0);
    const xorCode = charCode ^ keyCode;
    encryptedBytes.push(toHex(xorCode));
    steps.push({
      index,
      original: `${toCodeLabel(char)} (${charCode})`,
      value: `"${toCodeLabel(keyChar)}" (${keyCode})`,
      operation: `${charCode} XOR ${keyCode} = ${xorCode}`,
      encrypted: `0x${toHex(xorCode)}`
    });
  });

  return {
    encrypted: encryptedBytes.join(" "),
    steps
  };
}

function decryptXor(hexText, key) {
  const safeKey = key || "key";
  return hexText
    .split(" ")
    .filter(Boolean)
    .map((hexByte, index) => {
      const encryptedCode = Number.parseInt(hexByte, 16);
      const keyCode = safeKey[index % safeKey.length].charCodeAt(0);
      return String.fromCharCode(encryptedCode ^ keyCode);
    })
    .join("");
}

function transformPlayfairPair(first, second, matrix, positions, columns, direction) {
  const firstPosition = positions[first];
  const secondPosition = positions[second];
  let transformedFirst;
  let transformedSecond;
  let rule;

  if (firstPosition.row === secondPosition.row) {
    const offset = direction === "encrypt" ? 1 : -1;
    transformedFirst = matrix[firstPosition.row][(firstPosition.column + offset + columns) % columns];
    transformedSecond = matrix[secondPosition.row][(secondPosition.column + offset + columns) % columns];
    rule = direction === "encrypt"
      ? "Misma fila: cada letra avanza una columna"
      : "Misma fila: cada letra retrocede una columna";
  } else if (firstPosition.column === secondPosition.column) {
    const offset = direction === "encrypt" ? 1 : -1;
    transformedFirst = matrix[(firstPosition.row + offset + matrix.length) % matrix.length][firstPosition.column];
    transformedSecond = matrix[(secondPosition.row + offset + matrix.length) % matrix.length][secondPosition.column];
    rule = direction === "encrypt"
      ? "Misma columna: cada letra baja una fila"
      : "Misma columna: cada letra sube una fila";
  } else {
    transformedFirst = matrix[firstPosition.row][secondPosition.column];
    transformedSecond = matrix[secondPosition.row][firstPosition.column];
    rule = "Rectangulo: se intercambian las columnas";
  }

  return {
    firstPosition,
    secondPosition,
    transformedFirst,
    transformedSecond,
    rule
  };
}

function encryptPlayfair(text, key, config = getAlphabetConfig()) {
  const { columns, matrix, positions } = buildPlayfairMatrix(key, config);
  const pairs = preparePlayfairPairs(text, config);
  const encryptedChars = [...text];
  const insertionsAfter = {};
  const steps = [];

  [...text].forEach((char, index) => {
    if (!isLetterInAlphabet(char, config)) {
      steps.push({
        index,
        original: toCodeLabel(char),
        value: "No entra en la matriz",
        operation: "Numero, espacio o simbolo: se conserva igual",
        encrypted: toCodeLabel(char)
      });
    }
  });

  pairs.forEach(([firstToken, secondToken], pairIndex) => {
    const transformed = transformPlayfairPair(
      firstToken.letter,
      secondToken.letter,
      matrix,
      positions,
      columns,
      "encrypt"
    );

    encryptedChars[firstToken.sourceIndex] = transformed.transformedFirst;
    if (secondToken.sourceIndex === null) {
      insertionsAfter[firstToken.sourceIndex] = [
        ...(insertionsAfter[firstToken.sourceIndex] || []),
        transformed.transformedSecond
      ];
    } else {
      encryptedChars[secondToken.sourceIndex] = transformed.transformedSecond;
    }

    steps.push({
      index: pairIndex,
      original: `${firstToken.letter}${secondToken.letter}`,
      value: `Matriz ${matrix.length}x${columns} (${config.label}) con clave "${key || "clave"}"`,
      operation: `${transformed.rule}. ${firstToken.letter}=fila ${transformed.firstPosition.row + 1}, col ${transformed.firstPosition.column + 1}; ${secondToken.letter}=fila ${transformed.secondPosition.row + 1}, col ${transformed.secondPosition.column + 1}`,
      encrypted: `${transformed.transformedFirst}${transformed.transformedSecond}`
    });
  });

  return {
    encrypted: encryptedChars.map((char, index) => `${char}${(insertionsAfter[index] || []).join("")}`).join(""),
    steps
  };
}

function decryptPlayfair(text, key, config = getAlphabetConfig()) {
  const { columns, matrix, positions } = buildPlayfairMatrix(key, config);
  const pairs = preparePlayfairDecryptPairs(text, config);
  const decryptedChars = [...text];

  pairs.forEach(([firstToken, secondToken]) => {
    const transformed = transformPlayfairPair(
      firstToken.letter,
      secondToken.letter,
      matrix,
      positions,
      columns,
      "decrypt"
    );

    decryptedChars[firstToken.sourceIndex] = transformed.transformedFirst;
    decryptedChars[secondToken.sourceIndex] = transformed.transformedSecond;
  });

  return decryptedChars.join("");
}

function buildFourSquareMatrices(keyOne, keyTwo, config = getAlphabetConfig()) {
  const letters = config.fourSquareLetters;
  const columns = config.fourSquareColumns;
  const plainOne = buildKeyedMatrix("", letters, columns, normalizeFourSquareChar);
  const cipherOne = buildKeyedMatrix(keyOne || "clave", letters, columns, normalizeFourSquareChar);
  const cipherTwo = buildKeyedMatrix(keyTwo || "matriz", letters, columns, normalizeFourSquareChar);
  const plainTwo = buildKeyedMatrix("", letters, columns, normalizeFourSquareChar);

  return { columns, plainOne, cipherOne, cipherTwo, plainTwo };
}

function prepareFourSquarePairs(text, config = getAlphabetConfig()) {
  const tokens = [...text]
    .map((char, sourceIndex) => ({ letter: normalizeFourSquareChar(char), sourceIndex }))
    .filter((token) => config.fourSquareLetters.includes(token.letter));
  const pairs = [];

  for (let index = 0; index < tokens.length; index += 2) {
    pairs.push([
      tokens[index],
      tokens[index + 1] || { letter: "X", sourceIndex: null }
    ]);
  }

  return pairs;
}

function encryptFourSquare(text, keyOne, keyTwo, config = getAlphabetConfig()) {
  const { columns, plainOne, cipherOne, cipherTwo, plainTwo } = buildFourSquareMatrices(keyOne, keyTwo, config);
  const pairs = prepareFourSquarePairs(text, config);
  const encryptedChars = [...text];
  const insertionsAfter = {};
  const steps = [];

  [...text].forEach((char, index) => {
    if (!isFourSquareChar(char, config)) {
      steps.push({
        index,
        original: toCodeLabel(char),
        value: "No entra en la matriz",
        operation: "Simbolo no incluido: se conserva igual",
        encrypted: toCodeLabel(char)
      });
    }
  });

  pairs.forEach(([firstToken, secondToken], pairIndex) => {
    const firstPosition = plainOne.positions[firstToken.letter];
    const secondPosition = plainTwo.positions[secondToken.letter];
    const encryptedFirst = cipherOne.matrix[firstPosition.row][secondPosition.column];
    const encryptedSecond = cipherTwo.matrix[secondPosition.row][firstPosition.column];

    encryptedChars[firstToken.sourceIndex] = encryptedFirst;
    if (secondToken.sourceIndex === null) {
      insertionsAfter[firstToken.sourceIndex] = [
        ...(insertionsAfter[firstToken.sourceIndex] || []),
        encryptedSecond
      ];
    } else {
      encryptedChars[secondToken.sourceIndex] = encryptedSecond;
    }

    steps.push({
      index: pairIndex,
      original: `${firstToken.letter}${secondToken.letter}`,
      value: `Matrices ${plainOne.matrix.length}x${columns} (${config.label})`,
      operation: `${firstToken.letter}=fila ${firstPosition.row + 1}, col ${firstPosition.column + 1}; ${secondToken.letter}=fila ${secondPosition.row + 1}, col ${secondPosition.column + 1}. Se cruzan columnas en las matrices con clave.`,
      encrypted: `${encryptedFirst}${encryptedSecond}`
    });
  });

  return {
    encrypted: encryptedChars.map((char, index) => `${char}${(insertionsAfter[index] || []).join("")}`).join(""),
    steps
  };
}

function decryptFourSquare(text, keyOne, keyTwo, config = getAlphabetConfig()) {
  const { plainOne, cipherOne, cipherTwo, plainTwo } = buildFourSquareMatrices(keyOne, keyTwo, config);
  const pairs = prepareFourSquarePairs(text, config);
  const decryptedChars = [...text];

  pairs.forEach(([firstToken, secondToken]) => {
    const firstPosition = cipherOne.positions[firstToken.letter];
    const secondPosition = cipherTwo.positions[secondToken.letter];
    const decryptedFirst = plainOne.matrix[firstPosition.row][secondPosition.column];
    const decryptedSecond = plainTwo.matrix[secondPosition.row][firstPosition.column];

    decryptedChars[firstToken.sourceIndex] = decryptedFirst;
    if (secondToken.sourceIndex !== null) {
      decryptedChars[secondToken.sourceIndex] = decryptedSecond;
    }
  });

  return decryptedChars.join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSteps(steps) {
  if (steps.length === 0) {
    stepsBody.innerHTML = `<tr><td class="empty" colspan="5">Ingresa texto para ver los pasos del cifrado.</td></tr>`;
    stepCount.textContent = "0 pasos";
    return;
  }

  stepsBody.innerHTML = steps.map((step) => `
    <tr>
      <td>${step.index + 1}</td>
      <td><code>${escapeHtml(step.original)}</code></td>
      <td>${escapeHtml(step.value)}</td>
      <td>${escapeHtml(step.operation)}</td>
      <td><code>${escapeHtml(step.encrypted)}</code></td>
    </tr>
  `).join("");
  stepCount.textContent = `${steps.length} ${steps.length === 1 ? "paso" : "pasos"}`;
}

function renderMatrixPanel(label, matrix, columns) {
  return `
    <div class="matrix-panel">
      <div class="matrix-label">${escapeHtml(label)}</div>
      <div class="matrix-grid" style="grid-template-columns: repeat(${columns}, minmax(34px, 1fr));">
        ${matrix.flat().map((letter) => `<div class="matrix-cell">${escapeHtml(letter)}</div>`).join("")}
      </div>
    </div>
  `;
}

function getMethodName(value = method.value) {
  const names = {
    caesar: "Cesar",
    vigenere: "Vigenere",
    xor: "XOR",
    playfair: "Playfair",
    autoclave: "Autoclave",
    "four-square": "Four Square"
  };
  return names[value] || value;
}

function renderCipherMatrices(config = getAlphabetConfig()) {
  if (method.value === "playfair") {
    const { columns, matrix } = buildPlayfairMatrix(keyword.value, config);
    matrixTitle.textContent = "Matriz Playfair";
    matrixSize.textContent = `${matrix.length}x${columns}`;
    matrixView.className = "matrix-view";
    matrixView.innerHTML = renderMatrixPanel("Matriz con clave", matrix, columns);
    return;
  }

  if (method.value === "four-square") {
    const { columns, plainOne, cipherOne, cipherTwo, plainTwo } = buildFourSquareMatrices(keyword.value, keywordTwo.value, config);
    matrixTitle.textContent = "Matrices Four Square";
    matrixSize.textContent = `${plainOne.matrix.length}x${columns}`;
    matrixView.className = "matrix-view four-square-view";
    matrixView.innerHTML = [
      renderMatrixPanel("Superior izquierda: normal", plainOne.matrix, columns),
      renderMatrixPanel("Superior derecha: clave principal", cipherOne.matrix, columns),
      renderMatrixPanel("Inferior izquierda: clave secundaria", cipherTwo.matrix, columns),
      renderMatrixPanel("Inferior derecha: normal", plainTwo.matrix, columns)
    ].join("");
  }
}

function getMatrixReport(config = getAlphabetConfig()) {
  if (method.value === "playfair") {
    const { matrix } = buildPlayfairMatrix(keyword.value, config);
    return [{ label: "Matriz Playfair", matrix }];
  }

  if (method.value === "four-square") {
    const { plainOne, cipherOne, cipherTwo, plainTwo } = buildFourSquareMatrices(keyword.value, keywordTwo.value, config);
    return [
      { label: "Superior izquierda: normal", matrix: plainOne.matrix },
      { label: "Superior derecha: clave principal", matrix: cipherOne.matrix },
      { label: "Inferior izquierda: clave secundaria", matrix: cipherTwo.matrix },
      { label: "Inferior derecha: normal", matrix: plainTwo.matrix }
    ];
  }

  return [];
}

function buildDecryptProcedure(encrypted, decrypted, config = getAlphabetConfig()) {
  if (method.value === "caesar") {
    const amount = normalizeShift(shift.value, config);
    const reverse = config.letters.length - amount;
    return encryptCaesar(encrypted, reverse, config).steps.map((step) => ({
      index: step.index,
      original: step.original,
      value: `Desplazamiento inverso ${reverse}`,
      operation: step.operation,
      encrypted: step.encrypted
    }));
  }

  if (method.value === "vigenere") {
    const normalizedKey = cleanKeyword(keyword.value, config) || "CLAVE";
    let letterIndex = 0;
    return [...encrypted].map((char, index) => {
      if (!isLetterInAlphabet(char, config)) {
        return {
          index,
          original: toCodeLabel(char),
          value: "Clave no avanza",
          operation: "No es letra: se conserva igual",
          encrypted: toCodeLabel(char)
        };
      }

      const keyChar = normalizedKey[letterIndex % normalizedKey.length];
      const keyShift = config.letters.indexOf(keyChar);
      const shifted = shiftChar(char, config.letters.length - keyShift, config);
      letterIndex += 1;
      return {
        index,
        original: char,
        value: `Clave "${keyChar}" = ${keyShift}`,
        operation: `${shifted.originalPosition} - ${keyShift} -> ${shifted.shiftedPosition} mod ${config.letters.length}`,
        encrypted: shifted.char
      };
    });
  }

  if (method.value === "autoclave") {
    const stream = getAutoclaveStream(plainText.value, keyword.value, config);
    let letterIndex = 0;
    return [...encrypted].map((char, index) => {
      if (!isLetterInAlphabet(char, config)) {
        return {
          index,
          original: toCodeLabel(char),
          value: "Clave no avanza",
          operation: "No es letra: se conserva igual",
          encrypted: toCodeLabel(char)
        };
      }

      const keyChar = stream[letterIndex];
      const keyShift = config.letters.indexOf(keyChar);
      const shifted = shiftChar(char, config.letters.length - keyShift, config);
      letterIndex += 1;
      return {
        index,
        original: char,
        value: `Autoclave "${keyChar}" = ${keyShift}`,
        operation: `${shifted.originalPosition} - ${keyShift} -> ${shifted.shiftedPosition} mod ${config.letters.length}`,
        encrypted: shifted.char
      };
    });
  }

  if (method.value === "xor") {
    const safeKey = keyword.value || "key";
    return encrypted.split(" ").filter(Boolean).map((hexByte, index) => {
      const encryptedCode = Number.parseInt(hexByte, 16);
      const keyChar = safeKey[index % safeKey.length];
      const keyCode = keyChar.charCodeAt(0);
      const decoded = String.fromCharCode(encryptedCode ^ keyCode);
      return {
        index,
        original: `0x${hexByte}`,
        value: `"${toCodeLabel(keyChar)}" (${keyCode})`,
        operation: `${encryptedCode} XOR ${keyCode} = ${decoded.charCodeAt(0)}`,
        encrypted: toCodeLabel(decoded)
      };
    });
  }

  if (method.value === "playfair") {
    return preparePlayfairDecryptPairs(encrypted, config).map(([firstToken, secondToken], index) => ({
      index,
      original: `${firstToken.letter}${secondToken.letter}`,
      value: `Matriz Playfair con clave "${keyword.value || "clave"}"`,
      operation: "Se aplica la regla inversa: fila retrocede, columna sube, rectangulo conserva intercambio de columnas.",
      encrypted: decrypted
    }));
  }

  if (method.value === "four-square") {
    return prepareFourSquarePairs(encrypted, config).map(([firstToken, secondToken], index) => ({
      index,
      original: `${firstToken.letter}${secondToken.letter}`,
      value: `Claves "${keyword.value || "clave"}" y "${keywordTwo.value || "matriz"}"`,
      operation: "Se localiza el par cifrado en las matrices con clave y se cruza hacia las matrices normales.",
      encrypted: decrypted
    }));
  }

  return [];
}

function excelEscape(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function rowsToHtml(rows) {
  if (rows.length === 0) {
    return "<tr><td colspan=\"5\">Sin pasos para mostrar.</td></tr>";
  }

  return rows.map((step) => `
    <tr>
      <td>${step.index + 1}</td>
      <td>${excelEscape(step.original)}</td>
      <td>${excelEscape(step.value)}</td>
      <td>${excelEscape(step.operation)}</td>
      <td>${excelEscape(step.encrypted)}</td>
    </tr>
  `).join("");
}

function matrixToHtml(label, matrix) {
  return `
    <h3>${excelEscape(label)}</h3>
    <table border="1">
      ${matrix.map((row) => `
        <tr>${row.map((cell) => `<td>${excelEscape(cell)}</td>`).join("")}</tr>
      `).join("")}
    </table>
  `;
}

function downloadCurrentExcel() {
  if (!currentReport) {
    encryptCurrentText();
  }

  const report = currentReport;
  const matricesHtml = report.matrices.length
    ? report.matrices.map((item) => matrixToHtml(item.label, item.matrix)).join("")
    : "<p>Este metodo no usa matrices.</p>";
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 18px; }
          th, td { border: 1px solid #999; padding: 6px; vertical-align: top; }
          th { background: #ddebf7; font-weight: bold; }
          h1, h2, h3 { color: #1f4e79; }
        </style>
      </head>
      <body>
        <h1>Reporte de criptografia</h1>
        <h2>Configuracion</h2>
        <table border="1">
          <tr><th>Campo</th><th>Valor</th></tr>
          <tr><td>Metodo</td><td>${excelEscape(report.methodName)}</td></tr>
          <tr><td>Alfabeto</td><td>${excelEscape(report.alphabetLabel)}</td></tr>
          <tr><td>Texto original</td><td>${excelEscape(report.originalText)}</td></tr>
          <tr><td>Clave principal</td><td>${excelEscape(report.keyOne)}</td></tr>
          <tr><td>Clave secundaria</td><td>${excelEscape(report.keyTwo)}</td></tr>
          <tr><td>Desplazamiento</td><td>${excelEscape(report.shift)}</td></tr>
          <tr><td>Resultado cifrado</td><td>${excelEscape(report.encrypted)}</td></tr>
          <tr><td>Descifrado demostrativo</td><td>${excelEscape(report.decrypted)}</td></tr>
          <tr><td>Nota</td><td>${excelEscape(report.decryptHint)}</td></tr>
        </table>

        <h2>Procedimiento de cifrado</h2>
        <table border="1">
          <tr><th>#</th><th>Original</th><th>Valor usado</th><th>Operacion</th><th>Resultado</th></tr>
          ${rowsToHtml(report.encryptSteps)}
        </table>

        <h2>Procedimiento de descifrado</h2>
        <table border="1">
          <tr><th>#</th><th>Cifrado</th><th>Valor usado</th><th>Operacion inversa</th><th>Resultado</th></tr>
          ${rowsToHtml(report.decryptSteps)}
        </table>

        <h2>Matrices</h2>
        ${matricesHtml}
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-${report.methodName.toLowerCase().replace(/\s+/g, "-")}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateMethodUi() {
  const selected = method.value;
  const config = getAlphabetConfig();
  const usesCaesar = selected === "caesar";
  const usesKeyword = selected === "vigenere" || selected === "xor" || selected === "playfair" || selected === "autoclave" || selected === "four-square";
  const usesSecondKeyword = selected === "four-square";
  const usesAlphabet = selected !== "xor";

  alphabetField.hidden = !usesAlphabet;
  matrixCard.hidden = selected !== "playfair" && selected !== "four-square";
  shiftField.hidden = !usesCaesar;
  keywordField.hidden = !usesKeyword;
  keywordTwoField.hidden = !usesSecondKeyword;
  shift.max = config.letters.length - 1;
  keywordHint.textContent = selected === "xor"
    ? "En XOR, la clave se repite caracter por caracter."
    : selected === "playfair"
      ? alphabet.value === "spanish"
        ? "En Playfair español, la Ñ se reemplaza por N para mantener una matriz 5x5."
        : "En Playfair ingles, la clave ordena la matriz 5x5; la letra J se une con I."
      : selected === "autoclave"
        ? "Autoclave usa esta clave como inicio y despues continua con el texto original."
      : selected === "four-square"
        ? "Four Square usa esta clave para la matriz superior derecha."
      : "En Vigenere, solo las letras de la clave se usan como desplazamientos.";
  alphabetHint.textContent = alphabet.value === "spanish"
    ? "En español, la Ñ cuenta como una letra propia; Four Square tambien usa los numeros 0-8."
    : "En ingles, se usa A-Z; en Playfair y Four Square la J se trata como I.";
  methodHint.textContent = selected === "playfair" && alphabet.value === "spanish"
    ? "Usa una matriz 5x5; la Ñ se convierte en N y la J se trata como I."
    : selected === "autoclave"
      ? "La clave extendida se forma con la clave inicial seguida del texto."
    : selected === "four-square" && alphabet.value === "spanish"
      ? "Usa matrices 6x6 con 27 letras y los numeros del 0 al 8."
      : hints[selected];
  resultMode.textContent = selected === "caesar"
    ? "Cesar"
    : selected === "vigenere"
      ? "Vigenere"
      : selected === "xor"
        ? "XOR"
        : selected === "playfair"
          ? "Playfair"
          : selected === "autoclave"
            ? "Autoclave"
            : "Four Square";
  methodTriggerName.textContent = getMethodName(selected);

  methodOptions.forEach((option) => {
    option.classList.toggle("is-active", option.dataset.method === selected);
  });
}

function encryptCurrentText() {
  updateMethodUi();

  const text = plainText.value;
  const config = getAlphabetConfig();
  let output;
  let decrypted;
  let decryptedHintText = "El descifrado aplica la operacion inversa al resultado cifrado.";

  if (method.value === "caesar") {
    output = encryptCaesar(text, normalizeShift(shift.value, config), config);
    decrypted = encryptCaesar(output.encrypted, config.letters.length - normalizeShift(shift.value, config), config).encrypted;
  } else if (method.value === "vigenere") {
    output = encryptVigenere(text, keyword.value, config);
    decrypted = decryptVigenere(output.encrypted, keyword.value, config);
  } else if (method.value === "autoclave") {
    output = encryptAutoclave(text, keyword.value, config);
    decrypted = decryptAutoclave(output.encrypted, keyword.value, config);
    decryptedHintText = "En Autoclave, el descifrado reconstruye la clave extendida con el texto recuperado.";
  } else if (method.value === "playfair") {
    output = encryptPlayfair(text, keyword.value, config);
    decrypted = decryptPlayfair(output.encrypted, keyword.value, config);
    decryptedHintText = "En Playfair el descifrado es normalizado: Ñ aparece como N, J como I y pueden verse X de relleno.";
  } else if (method.value === "four-square") {
    output = encryptFourSquare(text, keyword.value, keywordTwo.value, config);
    decrypted = decryptFourSquare(output.encrypted, keyword.value, keywordTwo.value, config);
    decryptedHintText = alphabet.value === "spanish"
      ? "En Four Square español se descifra con A-Z, Ñ y 0-8; otros simbolos se conservan y puede verse X de relleno."
      : "En Four Square ingles el descifrado es normalizado: J aparece como I y puede verse X de relleno.";
  } else {
    output = encryptXor(text, keyword.value);
    decrypted = decryptXor(output.encrypted, keyword.value);
  }

  result.textContent = output.encrypted || "Sin texto para cifrar.";
  decryptedResult.textContent = decrypted || "Sin texto para descifrar.";
  decryptMode.textContent = method.value === "playfair" || method.value === "four-square" ? "Normalizado" : "Reverso";
  decryptHint.textContent = decryptedHintText;
  currentReport = {
    methodName: getMethodName(method.value),
    alphabetLabel: method.value === "xor" ? "No aplica" : config.label,
    originalText: text,
    keyOne: keywordField.hidden ? "No aplica" : keyword.value,
    keyTwo: keywordTwoField.hidden ? "No aplica" : keywordTwo.value,
    shift: shiftField.hidden ? "No aplica" : normalizeShift(shift.value, config),
    encrypted: output.encrypted,
    decrypted,
    decryptHint: decryptedHintText,
    encryptSteps: output.steps,
    decryptSteps: buildDecryptProcedure(output.encrypted, decrypted, config),
    matrices: getMatrixReport(config)
  };
  if (method.value === "playfair" || method.value === "four-square") {
    renderCipherMatrices(config);
  }
  renderSteps(output.steps);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  encryptCurrentText();
});

[plainText, method, alphabet, shift, keyword, keywordTwo].forEach((control) => {
  control.addEventListener("input", encryptCurrentText);
  control.addEventListener("change", encryptCurrentText);
});

function closeMethodPopover() {
  methodPopover.hidden = true;
  methodTrigger.setAttribute("aria-expanded", "false");
}

function toggleMethodPopover() {
  const willOpen = methodPopover.hidden;
  methodPopover.hidden = !willOpen;
  methodTrigger.setAttribute("aria-expanded", String(willOpen));
}

methodTrigger.addEventListener("click", toggleMethodPopover);

methodOptions.forEach((option) => {
  option.addEventListener("click", () => {
    method.value = option.dataset.method;
    closeMethodPopover();
    encryptCurrentText();
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".method-picker")) {
    closeMethodPopover();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMethodPopover();
    methodTrigger.focus();
  }
});

downloadExcel.addEventListener("click", downloadCurrentExcel);

encryptCurrentText();
