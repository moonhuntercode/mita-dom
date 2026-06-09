export default [
    {
        ignores: ["dist/**", "node_modules/**"]
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                // APIs del navegador
                window: "readonly",
                document: "readonly",
                HTMLElement: "readonly",
                customElements: "readonly",
                console: "readonly",
                URL: "readonly",
                Promise: "readonly",
                setTimeout: "readonly",
                // APIs nativas de Node para Tests
                global: "writable"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
