const tokenTypes = {
    // Operators
    equal: 0,
    plus: 1,
    minus: 2,
    star: 3,
    slash: 4,
    exp: 5,
    modulo: 6,
    less: 7,
    greater: 8,
    lessEqual: 9,
    greaterEqual: 10,
    equalEqual: 11,
    bangEqual: 12,
    and: 13,
    or: 14,
    bang: 15,
    leftParen: 16,
    rightParen: 17,
    semicolon: 18,
    comma: 19,

    // Literals
    number: 20,
    identifier: 21,

    // Technical
    error: 22,
    end: 23
};

const opCodes = {
    constant: 0,
    pop: 1,
    get: 2,
    set: 3,
    equal: 4,
    greater: 5,
    less: 6,
    add: 7,
    subtract: 8,
    multiply: 9,
    divide: 10,
    not: 11,
    negate: 12,
    call: 13,
    exp: 14,
    mod: 15,
    and: 16,
    or: 17
};

const precedenceLevels = {
    none: 0,
    assignment: 1,
    or: 2,
    and: 3,
    equality: 4,
    comparison: 5,
    term: 6,
    factor: 7,
    exp: 8,
    unary: 9,
    call: 10,
    primary: 11
};