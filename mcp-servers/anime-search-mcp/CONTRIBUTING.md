# Contributing to Jikan Anime Search MCP Plugin

Thank you for considering contributing to the Jikan Anime Search MCP Plugin! We welcome any contributions that help improve the plugin.

## How to Contribute

- **Reporting Bugs:** If you find a bug, please open an issue on our GitHub repository. Include a clear description, steps to reproduce, and any relevant error messages.
- **Suggesting Enhancements:** If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it.
- **Pull Requests:** We welcome pull requests for bug fixes, new features, and improvements.

## Development Setup

1.  **Fork & Clone:** Fork the repository and clone it to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/jikan-anime-search-mcp.git
    cd jikan-anime-search-mcp
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Branching:** Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature/your-feature-name  # For new features
    # or
    git checkout -b fix/your-bug-fix-name    # For bug fixes
    ```

## Coding Guidelines

Please refer to the `.github/copilot-instructions.md` file in this repository for detailed coding guidelines, including:

-   Node.js with TypeScript usage.
-   Axios for HTTP requests.
-   Directory structure.
-   Naming conventions (`camelCase` for variables/functions, `PascalCase` for components/classes).
-   JSDoc comments.
-   Error handling.
-   Accessibility and responsiveness (if applicable).
-   Unit testing requirements.

## Making Changes

1.  Make your changes, adhering to the coding guidelines.
2.  Ensure your code is well-documented with JSDoc comments.
3.  Write unit tests for any new API integrations or utility functions. Ensure all tests pass:
    ```bash
    npm test
    ```
4.  Lint your code:
    ```bash
    npm run lint
    ```
5.  Commit your changes with a clear and descriptive commit message:
    ```bash
    git commit -m "feat: Add new search functionality" 
    # or 
    git commit -m "fix: Resolve issue with API error handling"
    ```
    (Consider using [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.)

## Submitting a Pull Request

1.  Push your branch to your fork:
    ```bash
    git push origin feature/your-feature-name
    ```
2.  Open a pull request from your forked repository to the main project repository.
3.  Provide a clear description of your changes in the pull request.
4.  Link any relevant issues in your pull request description.

## Code of Conduct

*(TODO: Add a Code of Conduct or link to an existing one. This helps foster a positive and inclusive community.)*

Thank you for your contribution!
