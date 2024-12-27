import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";

const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

const getWeekDates = (offset = 0) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
    }

    return dates;
};

const formatDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day < 10 ? "0" : ""}${day}.${month < 10 ? "0" : ""}${month}`;
};

const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

const App = () => {
    const [tasks, setTasks] = useState({});
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekDates, setWeekDates] = useState(getWeekDates(currentWeekOffset));
    const [editingSlot, setEditingSlot] = useState(null);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [isAddingDailyTask, setIsAddingDailyTask] = useState(false);

    const fetchDailyTasks = async () => {
        const response = await fetch('http://localhost:8080/api/daily-tasks');
        const data = await response.json();
        setDailyTasks(data.map(task => ({ id: task.id, text: task.text, isEditing: false })));
    };

    const createDailyTask = async (text) => {
        const response = await fetch('http://localhost:8080/api/daily-tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        return data;
    };

    const deleteDailyTask = async (id) => {
        await fetch(`http://localhost:8080/api/daily-tasks/${id}`, {
            method: 'DELETE',
        });
    };

    const updateDailyTask = async (id, text) => {
        const response = await fetch(`http://localhost:8080/api/daily-tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        return data;
    };

    useEffect(() => {
        setWeekDates(getWeekDates(currentWeekOffset));
        fetchTasksForWeek(currentWeekOffset);
        fetchDailyTasks();
    }, [currentWeekOffset]);

    const fetchTasksForWeek = async (offset) => {
        const dates = getWeekDates(offset);
        const tasksForWeek = {};

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const response = await fetch(`http://localhost:8080/task-api/tasks?date=${date.toISOString().split('T')[0]}`);
            const data = await response.json();
            tasksForWeek[daysOfWeek[i]] = data.reduce((acc, task) => {
                const hour = new Date(`1970-01-01T${task.time}`).getHours();
                if (!acc[hour]) acc[hour] = [];
                acc[hour].push({ id: task.id, task: task.description });
                return acc;
            }, {});
        }

        setTasks({ [offset]: tasksForWeek });
    };

    const addTask = async (day, hour, task) => {
        if (task.trim()) {
            const date = weekDates[daysOfWeek.indexOf(day)];
            const response = await fetch('http://localhost:8080/task-api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: task,
                    date: date.toISOString().split('T')[0],
                    time: `${hour < 10? '0' + hour: hour}:00:00`,
                }),
            });
            const data = await response.json();
            setTasks((prevTasks) => ({
                ...prevTasks,
                [currentWeekOffset]: {
                    ...prevTasks[currentWeekOffset],
                    [day]: {
                        ...prevTasks[currentWeekOffset]?.[day],
                        [hour]: [
                            ...(prevTasks[currentWeekOffset]?.[day]?.[hour] || []),
                            { id: data.id, task: data.description },
                        ],
                    },
                },
            }));
        }
    };

    const deleteTask = async (day, hour, index) => {
        const task = tasks[currentWeekOffset][day][hour][index];
        await fetch(`http://localhost:8080/task-api/tasks/${task.id}`, {
            method: 'DELETE',
        });
        setTasks((prevTasks) => ({
            ...prevTasks,
            [currentWeekOffset]: {
                ...prevTasks[currentWeekOffset],
                [day]: {
                    ...prevTasks[currentWeekOffset][day],
                    [hour]: prevTasks[currentWeekOffset][day][hour].filter((_, i) => i !== index),
                },
            },
        }));
    };

    const handleSlotClick = (day, hour) => {
        setEditingSlot({ day, hour });
    };

    const handleInputKeyPress = (e, day, hour) => {
        if (e.key === "Enter") {
            addTask(day, hour, e.target.value);
            setEditingSlot(null);
        } else if (e.key === "Escape") {
            setEditingSlot(null);
        }
    };

    const renderTasks = (day, hour) => {
        const weekTasks = tasks[currentWeekOffset] || {};
        return (
            <div className="hour-tasks">
                {weekTasks[day]?.[hour]?.map(({ id, task }, index) => (
                    <div
                        key={id}
                        className="task"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="task-text">{task}</div>
                        <input
                            type="checkbox"
                            className="delete-checkbox"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(day, hour, index);
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    };


    const addDailyTask = () => {
        setIsAddingDailyTask(true);
        const newTask = { id: Date.now(), text: "", isEditing: true };
        setDailyTasks([...dailyTasks, newTask]);
    };

    const removeDailyTask = async (id) => {
        const task = dailyTasks.find(task => task.id === id);
        if (task.id) {
            await deleteDailyTask(id);
        }
        setDailyTasks(dailyTasks.filter((task) => task.id !== id));
        setIsAddingDailyTask(false);
    };

    const updateDailyTaskText = (id, text) => {
        setDailyTasks(dailyTasks.map((task) => (task.id === id ? { ...task, text } : task)));
    };

    const handleDailyTaskKeyPress = async (e, id) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const task = dailyTasks.find(task => task.id === id);
            if (task.text.trim()) {
                const createdTask = await createDailyTask(task.text);
                setDailyTasks(dailyTasks.map((task) => task.id === id ? { ...task, id: createdTask.id, isEditing: false } : task));
                setIsAddingDailyTask(false);
            } else {
                setDailyTasks(dailyTasks.filter((task) => task.id !== id));
                setIsAddingDailyTask(false);
            }
        }
    };


    const handleDrop = (day, hour, item) => {
        addTask(day, hour, item.task.text);
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="planner">
                <div className="header">
                    <button onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}>←</button>
                    <h1>
                        {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                    </h1>
                    <button onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}>→</button>
                </div>
                <div className="calendar-scroll">
                    <div className="calendar">
                        {daysOfWeek.map((day, dayIndex) => (
                            <div key={day} className="day">
                                <div className="day-header">
                                    <h2>
                                        {day} ({formatDate(weekDates[dayIndex])})
                                    </h2>
                                </div>
                                <div className="hours-scroll">
                                    <div className="hours">
                                        {hoursOfDay.map((hour) => (
                                            <div
                                                key={hour}
                                                className="hour-slot"
                                                onClick={() => handleSlotClick(day, hour)}
                                            >
                                                <div className="hour-label">{hour}:00</div>
                                                {editingSlot?.day === day && editingSlot?.hour === hour ? (
                                                    <div className="task-input-container">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            className="task-input"
                                                            onKeyDown={(e) => handleInputKeyPress(e, day, hour)}
                                                            onBlur={() => setEditingSlot(null)}
                                                        />
                                                        {renderTasks(day, hour)} {/* Show existing tasks */}
                                                    </div>
                                                ) : (
                                                    <DroppableSlot day={day} hour={hour} onDrop={handleDrop}>
                                                        {renderTasks(day, hour)}
                                                    </DroppableSlot>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Блок с повседневными задачами */}
                <div className="daily-tasks-section">
                    <h3>Повседневные задачи</h3>
                    <button onClick={addDailyTask} className="add-daily-task-button" disabled={isAddingDailyTask}>
                        +
                    </button>
                    <div className="daily-tasks-list">
                        {dailyTasks.map((task) => (
                            <DraggableTask
                                key={task.id}
                                task={task}
                                onRemove={removeDailyTask}
                                onUpdateText={updateDailyTaskText}
                                onKeyPress={(e) => handleDailyTaskKeyPress(e, task.id)}
                                canDrag={!task.isEditing}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

const DraggableTask = ({ task, onRemove, onUpdateText, onKeyPress, canDrag }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "task",
        item: { task },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: () => canDrag && !task.isEditing,
    }), [canDrag, task.isEditing]);

    return (
        <div
            ref={drag}
            className="daily-task"
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            {task.isEditing ? (
                <input
                    type="text"
                    value={task.text}
                    onChange={(e) => onUpdateText(task.id, e.target.value)}
                    onKeyDown={onKeyPress}
                    placeholder="Введите задачу"
                    className="daily-task-input"
                    autoFocus
                />
            ) : (
                <div className="daily-task-text">{task.text}</div>
            )}
            {!task.isEditing && (
                <button onClick={() => onRemove(task.id)} className="remove-daily-task">
                    ×
                </button>
            )}
        </div>
    );
};


const DroppableSlot = ({ day, hour, onDrop, children }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: "task",
        drop: (item) => onDrop(day, hour, item),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    return (
        <div
            ref={drop}
            className="droppable-slot"
            style={{ backgroundColor: isOver ? "#e8f0fe" : "transparent" }}
        >
            {children}
        </div>
    );
};

export default App;