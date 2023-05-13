export const convertObjectToParams = (input: any) => {
    const params = new URLSearchParams();

    Object.keys(input).forEach(key => {
        params.append(key, input[key]);
    });

    return params.toString();
}