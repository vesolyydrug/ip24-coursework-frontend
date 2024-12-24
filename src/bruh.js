import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getWeekDates = (offset = 0) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7); // Monday of the current week

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
    const month = date.getMonth() + 1; // Months are zero-based
    return `${day < 10 ? "0" : ""}${day}.${month < 10 ? "0" : ""}${month}`;
};

const hoursOfDay = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00

const App = () => {
    const [tasks, setTasks] = useState({});
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekDates, setWeekDates] = useState(getWeekDates(currentWeekOffset));
    const [editingSlot, setEditingSlot] = useState(null); // { day, hour }
    const [dailyTasks, setDailyTasks] = useState([]); // Повседневные задачи

    useEffect(() => {
        setWeekDates(getWeekDates(currentWeekOffset));
    }, [currentWeekOffset]);

    const addTask = (day, hour, task) => {
        if (task.trim()) {
            setTasks((prevTasks) => ({
                ...prevTasks,
                [currentWeekOffset]: {
                    ...prevTasks[currentWeekOffset],
                    [day]: {
                        ...prevTasks[currentWeekOffset]?.[day],
                        [hour]: [
                            ...(prevTasks[currentWeekOffset]?.[day]?.[hour] || []),
                            { task, completed: false },
                        ],
                    },
                },
            }));
        }
    };

    const toggleTaskCompletion = (day, hour, index) => {
        setTasks((prevTasks) => ({
            ...prevTasks,
            [currentWeekOffset]: {
                ...prevTasks[currentWeekOffset],
                [day]: {
                    ...prevTasks[currentWeekOffset][day],
                    [hour]: prevTasks[currentWeekOffset][day][hour].map((item, i) =>
                        i === index ? { ...item, completed: !item.completed } : item
                    ),
                },
            },
        }));
    };

    const deleteTask = (day, hour, index) => {
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
            setEditingSlot(null); // Cancel task creation
        }
    };

    const renderTasks = (day, hour) => {
        const weekTasks = tasks[currentWeekOffset] || {};
        return (
            <div className="hour-tasks">
                {weekTasks[day]?.[hour]?.map(({ task, completed }, index) => (
                    <div
                        key={index}
                        className={`task ${completed ? "completed" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation(); // Предотвращаем всплытие события
                            toggleTaskCompletion(day, hour, index);
                        }}
                    >
                        <div className="task-text">{task}</div>
                        <input
                            type="checkbox"
                            className="delete-checkbox"
                            onClick={(e) => {
                                e.stopPropagation(); // Предотвращаем всплытие события
                                deleteTask(day, hour, index);
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // Добавление повседневной задачи
    const addDailyTask = () => {
        setDailyTasks([...dailyTasks, { id: Date.now(), text: "", isEditing: true }]);
    };

    // Удаление повседневной задачи
    const removeDailyTask = (id) => {
        setDailyTasks(dailyTasks.filter((task) => task.id !== id));
    };

    // Обновление текста повседневной задачи
    const updateDailyTaskText = (id, text) => {
        setDailyTasks(
            dailyTasks.map((task) => (task.id === id ? { ...task, text } : task))
        );
    };

    // Фиксация текста задачи после нажатия Enter
    const handleDailyTaskKeyPress = (e, id) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setDailyTasks(
                dailyTasks.map((task) =>
                    task.id === id ? { ...task, isEditing: false } : task
                )
            );
        }
    };

    // Перетаскивание задачи в календарь
    const handleDrop = (day, hour, item) => {
        // Создаём копию задачи в выбранном дне и времени
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
                    <h3>Daily Tasks</h3>
                    <button onClick={addDailyTask} className="add-daily-task-button">
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
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

// Компонент для перетаскивания задачи
const DraggableTask = ({ task, onRemove, onUpdateText, onKeyPress }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "task",
        item: { task }, // Передаём задачу как элемент для перетаскивания
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: !task.isEditing, // Запрещаем перетаскивание, если задача редактируется
    }));

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
                    placeholder="Enter task"
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

// Компонент для приёма перетаскиваемой задачи
const DroppableSlot = ({ day, hour, onDrop, children }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: "task",
        drop: (item) => onDrop(day, hour, item), // Обрабатываем перетаскивание
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