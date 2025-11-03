const User = require('../models/user');
const Task = require('../models/task');

module.exports = function (router) {
  const usersRoute = router.route('/users');

  usersRoute.get(async (req, res) => {
    try {
      const where  = req.query.where  ? JSON.parse(req.query.where)  : {};
      const sort   = req.query.sort   ? JSON.parse(req.query.sort)   : {};
      const select = req.query.select ? JSON.parse(req.query.select) : {};
      const skip   = req.query.skip   ? parseInt(req.query.skip)     : 0;
      const limit  = req.query.limit  ? parseInt(req.query.limit)    : 0;

      let query = User.find(where).sort(sort).select(select).skip(skip).limit(limit);

      if (req.query.count === "true") {
        const count = await User.countDocuments(where);
        return res.status(200).json({ message: "OK", data: count });
      }

      const users = await query.exec();
      res.status(200).json({ message: "OK", data: users });

    } catch (err) {
      res.status(500).json({ message: "Server error", data: err });
    }
  });

  usersRoute.post(async (req, res) => {
    try {
      if (!req.body.name || !req.body.email) {
        return res.status(400).json({ message: "Name and email are required.", data: {} });
      }

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        pendingTasks: req.body.pendingTasks || []
      });

      const savedUser = await newUser.save();
      res.status(201).json({ message: "User created", data: savedUser });
    } catch (err) {
      if (err.code === 11000) {
        res.status(400).json({ message: "Email already exists.", data: err });
      } else {
        res.status(500).json({ message: "Server error", data: err });
      }
    }
  });

  const userById = router.route('/users/:id');

  userById.get(async (req, res) => {
    try {
      const select = req.query.select ? JSON.parse(req.query.select) : {};
      const user = await User.findById(req.params.id).select(select);
      if (!user) return res.status(404).json({ message: "User not found", data: {} });
      res.status(200).json({ message: "OK", data: user });
    } catch (err) {
      res.status(500).json({ message: "Server error", data: err });
    }
  });

  userById.put(async (req, res) => {
    try {
      if (!req.body.name || !req.body.email) {
        return res.status(400).json({ message: "Name and email are required.", data: {} });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          email: req.body.email,
          pendingTasks: req.body.pendingTasks || []
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) return res.status(404).json({ message: "User not found", data: {} });
      res.status(200).json({ message: "User updated", data: updatedUser });
    } catch (err) {
      res.status(500).json({ message: "Server error", data: err });
    }
  });


  userById.delete(async (req, res) => {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) return res.status(404).json({ message: "User not found", data: {} });

      await Task.updateMany(
        { assignedUser: req.params.id },
        { assignedUser: "", assignedUserName: "unassigned" }
      );

      res.status(204).json({ message: "User deleted", data: {} });
    } catch (err) {
      res.status(500).json({ message: "Server error", data: err });
    }
  });

  return router;
};
