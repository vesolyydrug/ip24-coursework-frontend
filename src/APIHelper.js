
const fetchTasks = async (date) => {
    const response = await fetch(`http://localhost:8080/api/tasks?date=${date.toISOString().split('T')[0]}`);
    const data = await response.json();
    return data;
};


