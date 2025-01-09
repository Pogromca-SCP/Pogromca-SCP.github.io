// @ts-check
import { gameStates, responseCodes } from "./enums.js";
import { hide, show, randRange, shuffle } from "./utils.js";

const amount = /** @type {Readonly<HTMLInputElement>} */ (document.getElementById("amount"));
const category = /** @type {HTMLSelectElement} */ (document.getElementById("category"));
const difficulty = /** @type {Readonly<HTMLSelectElement>} */ (document.getElementById("difficulty"));
const errors = /** @type {HTMLUListElement} */ (document.getElementById("errors"));
const loader = /** @type {HTMLDivElement} */ (document.getElementById("loader"));
const timer = /** @type {HTMLHeadingElement} */ (document.getElementById("timer"));
const question = /** @type {HTMLHeadingElement} */ (document.getElementById("question"));
const decoder = document.createElement("textarea");

/**
 * @typedef {object} Row
 * @property {HTMLDivElement} root
 * @property {HTMLHeadingElement} display
 * 
 * @typedef {"A" | "B" | "C" | "D"} RowId
 */

/** @param {RowId} id */
const getRow = id => ({
  root: /** @type {HTMLDivElement} */ (document.getElementById(`${id}-row`)),
  display: /** @type {HTMLHeadingElement} */ (document.getElementById(`${id}-text`)),
});

/** @type {Readonly<Record<RowId, Row>>} */
const rows = {
  A: getRow("A"),
  B: getRow("B"),
  C: getRow("C"),
  D: getRow("D"),
};

/** @type {readonly RowId[]} */
const rowsIds = ["A", "B", "C", "D"];

/** @param {string} message */
const addError = message => {
  const element = document.createElement("li");
  element.innerText = message;
  errors.appendChild(element);
};

const clearErrors = () => errors.innerHTML = "";

const gameState = {
  /** @type {gameStates} */
  state: gameStates.initial,
  /** @type {Question[]} */
  questions: [],
  score: 0,
  time: 0,
  rounds: 0,
  correct: rowsIds[0],
};

const ROUND_TIME = 20;
const RESULTS_TIME = 3;

/** @param {string} str */
const decode = str => {
  decoder.innerHTML = str;
  const result = decoder.value;
  decoder.innerHTML = "";
  return result;
};

/**
 * @typedef {object} TriviaCategory
 * @property {number} id
 * @property {string} name
 * 
 * @typedef {object} TriviaCategories
 * @property {TriviaCategory[]} trivia_categories
 * 
 * @typedef {object} Question
 * @property {string} category
 * @property {string} correct_answer
 * @property {"easy" | "medium" | "hard"} difficulty
 * @property {string[]} incorrect_answers
 * @property {string} question
 * @property {"boolean" | "multiple"} type
 * 
 * @typedef {object} QuestionResponse
 * @property {responseCodes} response_code
 * @property {Question[]} results
 */

const loadCategories = async () => {
  if (gameState.state !== gameStates.initial) {
    return;
  }

  try {
    const res = await fetch("https://opentdb.com/api_category.php");
    /** @type {TriviaCategories} */
    const body = await res.json();
    
    for (const cat of body.trivia_categories) {
      const element = document.createElement("option");
      element.value = cat.id.toString();
      element.innerText = cat.name;
      category.appendChild(element);
    }
  } catch (err) {
    addError("A problem has occured when loading categories. Check console for more details.");
    console.error(err);
  }

  hide(loader);
  gameState.state = gameStates.settings;
};

const loadQuestions = async () => {
  if (gameState.state !== gameStates.settings) {
    return;
  }

  gameState.state = gameStates.loading;
  question.innerHTML = "";
  clearErrors();
  show(loader);
  let request = `https://opentdb.com/api.php?amount=${amount.value}`;

  if (category.value !== "") {
    request += `&category=${category.value}`;
  }

  if (difficulty.value !== "") {
    request += `&difficulty=${difficulty.value}`;
  }

  try {
    const res = await fetch(request);
    /** @type {QuestionResponse} */
    const body = await res.json();
    
    switch (body.response_code) {
      case responseCodes.success:
        gameState.questions = body.results;
        gameState.score = 0;
        gameState.rounds = body.results.length;
        hide(loader);
        gameState.state = gameStates.results;
        setTimeout(gameLoop, 100);
        return;
      case responseCodes.noResults:
        addError("Not enough questions found with selected properties.");
        break;
      case responseCodes.invalidParameter:
        addError("An invalid parameter was provided.");
        break;
      case responseCodes.rateLimit:
        addError("Too many requests sent from your device in short timespan. Try again later.");
        break;
      default:
        addError("A token error has occured. This should never happen!");
        break;
    }
  } catch (err) {
    addError("A problem has occured when loading questions. Check console for more details.");
    console.error(err);
  }

  hide(loader);
  gameState.state = gameStates.settings;
};

/**
 * @param {number | null} seconds
 * @param {boolean} doSetup
 */
const updateTimer = (seconds = null, doSetup = true) => {
  if (seconds === null) {
    --gameState.time;
  } else {
    gameState.time = seconds;
  }

  timer.innerText = gameState.time.toString();

  if (doSetup) {
    setTimeout(gameLoop, 1000);
  }
};

const gameLoop = () => {
  if (gameState.state < gameStates.question) {
    return;
  }

  if (gameState.time > 0) {
    updateTimer();
    return;
  }

  if (gameState.state === gameStates.question) {
    gameState.state = gameStates.results;
    question.innerText = `Time's up. Correct answer was ${gameState.correct}`;
    updateTimer(RESULTS_TIME);
    return;
  }

  for (const row in rows) {
    hide(rows[row].root);
  }

  const current = gameState.questions.pop();

  if (current === undefined) {
    timer.innerHTML = "";
    question.innerText = `Game finished. Final score: ${gameState.score}/${gameState.rounds}`;
    gameState.state = gameStates.settings;
    return;
  }

  const isBoolean = current.type === "boolean";
  current.incorrect_answers = shuffle(current.incorrect_answers);
  gameState.correct = isBoolean ? (current.correct_answer === "True" ? rowsIds[0] : rowsIds[1]) : rowsIds[randRange(0, rowsIds.length - 1)];
  question.innerText = decode(current.question);
  const rowSrc = isBoolean ? [rowsIds[0], rowsIds[1]] : shuffle(rowsIds);

  for (const row of rowSrc) {
    const tmp = rows[row];
    tmp.display.innerText = decode(row === gameState.correct ? current.correct_answer : current.incorrect_answers.pop() ?? "");
    show(tmp.root);
  }

  gameState.state = gameStates.question;
  updateTimer(ROUND_TIME);
};

/** @param {RowId} id */
const answer = id => {
  if (gameState.state !== gameStates.question) {
    return;
  }

  gameState.state = gameStates.results;
  const isCorrect = id === gameState.correct;
  updateTimer(RESULTS_TIME, false);
  question.innerText = isCorrect ? "Correct answer." : `Incorrect. Correct answer was ${gameState.correct}`;

  if (isCorrect) {
    ++gameState.score;
  }
};

window["startGame"] = loadQuestions;
window["answer"] = answer;
loadCategories();