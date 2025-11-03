const Task = require('../models/task');
const User = require('../models/user');

module.exports = function (router) {

  const tasksRoute = router.route('/tasks');

  tasksRoute.get(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');  
    try {
      const where  = req.query.where  ? JSON.parse(req.query.where)  : {};
      const sort   = req.query.sort   ? JSON.parse(req.query.sort)   : {};
      const select = req.query.select ? JSON.parse(req.query.select) : {};
      const skip   = req.query.skip   ? parseInt(req.query.skip)     : 0;
      const limit  = req.query.limit  ? parseInt(req.query.limit)    : 100;

      if (req.query.count === "true") {
        const count = await Task.countDocuments(where);
        return res.status(200).json({ message: "Count of matching tasks.", data: count });
      }

      const tasks = await Task.find(where).sort(sort).select(select).skip(skip).limit(limit);
      res.status(200).json({ message: "Tasks successfully retrieved.", data: tasks });

    } catch (err) {
      res.status(500).json({ message: "can't retrive tasks.", data: err });
    }
  });

  tasksRoute.post(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (!req.body.name || !req.body.deadline) {
        return res.status(400).json({
          message: "Task must have a name and deadline.",
          data: {}
        });
      }

      const newTask = new Task({
        name: req.body.name,
        description: req.body.description || "",
        deadline: req.body.deadline,
        completed: req.body.completed || false,
        assignedUser: req.body.assignedUser || "",
        assignedUserName: req.body.assignedUserName || "unassigned"
      });

      const savedTask = await newTask.save();

      if (savedTask.assignedUser && !savedTask.completed) {
        await User.findByIdAndUpdate(savedTask.assignedUser, {
          $addToSet: { pendingTasks: savedTask._id }
        });
      }

      res.status(201).json({
        message: "Task created successfully.",
        data: savedTask
      });

    } catch (err) {
      res.status(500).json({
        message: "can't create task.",
        data: err
      });
    }
  });

  const taskById = router.route('/tasks/:id');

  taskById.get(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const select = req.query.select ? JSON.parse(req.query.select) : {};
      const task = await Task.findById(req.params.id).select(select);
      if (!task) {
        return res.status(404).json({ message: "Task not found.", data: {} });
      }
      res.status(200).json({
        message: "Task retrieved successfully.",
        data: task
      });
    } catch (err) {
      res.status(500).json({ message: "can't fetch task.", data: err });
    }
  });

  taskById.put(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (!req.body.name || !req.body.deadline) {
        return res.status(400).json({
          message: "Task must have a name and deadline.",
          data: {}
        });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          description: req.body.description || "",
          deadline: req.body.deadline,
          completed: req.body.completed || false,
          assignedUser: req.body.assignedUser || "",
          assignedUserName: req.body.assignedUserName || "unassigned"
        },
        { new: true, runValidators: true }
      );

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found.", data: {} });
      }

      await User.updateMany(
        { pendingTasks: updatedTask._id },
        { $pull: { pendingTasks: updatedTask._id } }
      );
      if (updatedTask.assignedUser && !updatedTask.completed) {
        await User.findByIdAndUpdate(updatedTask.assignedUser, {
          $addToSet: { pendingTasks: updatedTask._id }
        });
      }

      res.status(200).json({
        message: "Task updated successfully.",
        data: updatedTask
      });

    } catch (err) {
      res.status(500).json({ message: "can't update task.", data: err });
    }
  });


  taskById.delete(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
      if (!deletedTask) {
        return res.status(404).json({ message: "Task not found.", data: {} });
      }

      await User.updateMany(
        { pendingTasks: deletedTask._id },
        { $pull: { pendingTasks: deletedTask._id } }
      );

      res.status(204).json({
        message: "Task deleted successfully.",
        data: {}
      });

    } catch (err) {
      res.status(500).json({ message: "can't delete task.", data: err });
    }
  });

  return router;
};
