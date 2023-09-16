module.exports = (json = "") => {
    if (json === "") return false;

    let json_data = json + '';
    try {
        const test_json = JSON.parse(json_data);

        if (typeof test_json === "object")
            return true;
        else
            return false;
    } catch (err) {
        return false;
    }
}