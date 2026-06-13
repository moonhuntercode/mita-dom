import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: ["dist/**"],
        files: ["src/**/*.js", "test/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            "no-unused-vars": ["error", { 
                "argsIgnorePattern": "^_|^t$", 
                "caughtErrorsIgnorePattern": "^_|^e$" 
            }],
            "no-undef": "error"
        }
    }
];
