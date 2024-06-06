const namespace = 'mercury-layer'

const setItem = (key, jsonData, isUpdate = false) => {
    const namespacedKey = `${namespace}:${key}`;
    
    if (!isUpdate && localStorage.getItem(namespacedKey) !== null) {
        throw new Error(`Key "${namespacedKey}" already exists.`);
    }
    
    localStorage.setItem(namespacedKey, JSON.stringify(jsonData));
}

const getItem = (key) => {
    const namespacedKey = `${namespace}:${key}`;
    const jsonData = localStorage.getItem(namespacedKey);
    
    if (jsonData === null) {
        throw new Error(`Key "${namespacedKey}" does not exist.`);
    }
    
    return JSON.parse(jsonData);
}

export default { setItem, getItem }
