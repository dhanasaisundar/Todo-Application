const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format } = require("date-fns");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let database = null;

const PORT = 3000;

const initializeDatabaseAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () =>
      console.log(`Server started listening at port: ${PORT}`)
    );
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDatabaseAndServer();

app.get("/todos", async (request, response) => {
  const { status, priority, category, search_q } = request.query;
  const possibleStatus = ["TO DO", "IN PROGRESS", "DONE", undefined];
  const possiblePriority = ["HIGH", "MEDIUM", "LOW", undefined];
  const possibleCategory = ["WORK", "HOME", "LEARNING", undefined];

  if (!possibleStatus.includes(status)) {
    response.status(400).send("Invalid Todo Status");
    return;
  }

  if (!possiblePriority.includes(priority)) {
    response.status(400).send("Invalid Todo Priority");
    return;
  }

  if (!possibleCategory.includes(category)) {
    response.status(400).send("Invalid Todo Category");
    return;
  }

  let selectQuery;

  if (status && priority) {
    selectQuery = `SELECT * FROM todo WHERE status = '${status}' and priority = '${priority}';`;
  } else if (status && category) {
    selectQuery = `SELECT * FROM todo WHERE status = '${status}'and category = '${category}';`;
  } else if (category && priority) {
    selectQuery = `SELECT * FROM todo WHERE category = '${category}'and priority = '${priority}';`;
  } else if (status) {
    selectQuery = `SELECT * FROM todo WHERE status = '${status}';`;
  } else if (priority) {
    selectQuery = `SELECT * FROM todo WHERE priority = '${priority}';`;
  } else if (category) {
    selectQuery = `SELECT * FROM todo WHERE category = '${category}';`;
  } else if (search_q) {
    selectQuery = `SELECT * FROM todo WHERE todo like '%${search_q}%';`;
  }

  try {
    const dbResponse = await database.all(selectQuery);
    if (dbResponse) {
      response.status(200).send(dbResponse);
    } else {
      response.status(404).send(`No data found`);
    }
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const selectQuery = `SELECT * FROM todo WHERE id = '${todoId}';`;
  try {
    const dbResponse = await database.all(selectQuery);
    if (dbResponse) {
      response.status(200).send(dbResponse);
    } else {
      response.status(404).send(`No data found`);
    }
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const isDateValid = isValid(new Date(date));

  if (!isDateValid) {
    response.status(400).send("Invalid Due Date");
    return;
  }

  const formattedDueDate = format(new Date(date), "yyyy-MM-dd");
  const selectQuery = `SELECT * FROM todo WHERE due_date = '${formattedDueDate}';`;

  try {
    const dbResponse = await database.all(selectQuery);
    if (dbResponse && dbResponse.length > 0) {
      response.status(200).send(dbResponse);
    } else {
      response.status(404).send(`No data found`);
    }
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const possibleStatus = ["TO DO", "IN PROGRESS", "DONE", undefined];
  const possiblePriority = ["HIGH", "MEDIUM", "LOW", undefined];
  const possibleCategory = ["WORK", "HOME", "LEARNING", undefined];

  if (!possibleStatus.includes(status)) {
    response.status(400).send("Invalid Todo Status");
    return;
  }

  if (!possiblePriority.includes(priority)) {
    response.status(400).send("Invalid Todo Priority");
    return;
  }

  if (!possibleCategory.includes(category)) {
    response.status(400).send("Invalid Todo Category");
    return;
  }

  const isDateValid = isValid(new Date(dueDate));

  if (!isDateValid) {
    response.status(400).send("Invalid Due Date");
    return;
  }

  try {
    const insertQuery = `
      INSERT INTO todo (id, todo, priority, status, category, due_date) 
      VALUES ('${id}','${todo}','${priority}','${status}','${category}','${dueDate}');`;
    await database.run(insertQuery);
    response.status(200).send("Todo Successfully Added");
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category } = request.body;
  let updateQuery;
  let responseBody;
  if (
    todo !== undefined &&
    priority === undefined &&
    status === undefined &&
    category === undefined
  ) {
    updateQuery = `UPDATE todo SET todo='${todo}' WHERE id='${todoId}';`;
    responseBody = `Todo Updated`;
  } else if (
    status !== undefined &&
    todo === undefined &&
    priority === undefined &&
    category === undefined
  ) {
    updateQuery = `UPDATE todo SET status='${status}' WHERE id='${todoId}';`;
    responseBody = `Status Updated`;
  } else if (
    priority !== undefined &&
    status === undefined &&
    todo === undefined &&
    category === undefined
  ) {
    updateQuery = `UPDATE todo SET priority='${priority}' WHERE id='${todoId}';`;
    responseBody = `Priority Updated`;
  } else if (
    category !== undefined &&
    status === undefined &&
    todo === undefined &&
    priority === undefined
  ) {
    updateQuery = `UPDATE todo SET priority='${priority}' WHERE id='${todoId}';`;
    responseBody = `Category Updated`;
  }

  try {
    const dbResponse = await database.run(updateQuery);
    response.status(200).send(responseBody);
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE todo WHERE id ='${todoId}'`;

  try {
    const dbResponse = await database.run(deleteQuery);
    response.status(200).send("Todo Deleted");
  } catch (error) {
    response.status(500).send(`DB Error: ${error.message}`);
  }
});

module.exports = app;
