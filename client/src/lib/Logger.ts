import chalk from "chalk";

export const log = ({type, message}: {type: string, message: string}) => {
    switch (type) {
        case "message":
            console.log(chalk.blue(message));
            break;
        case "error":
            console.log(chalk.red(message));
            break;
        case "success":
            console.log(chalk.green(message));
            break;
        default:
            console.log(chalk.red(`Type was not provided for: ${message}`));
            break;
    }
}