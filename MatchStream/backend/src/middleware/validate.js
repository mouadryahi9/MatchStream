import Joi from "joi";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      return res.status(400).json({ error: "Validation failed", details });
    }

    req[source] = value;
    next();
  };
}

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).max(128).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createMatch: Joi.object({
    title: Joi.string().max(500).required(),
    sport: Joi.string().max(100).required(),
    league: Joi.string().max(255).allow(""),
    home_team: Joi.string().max(255).allow(""),
    away_team: Joi.string().max(255).allow(""),
    start_time: Joi.date().iso().allow(null),
    external_id: Joi.string().max(255).allow(""),
    metadata: Joi.object().default({}),
  }),

  startStream: Joi.object({
    match_id: Joi.string().uuid().required(),
    title: Joi.string().max(500).required(),
    source_url: Joi.string().uri().required(),
    source_type: Joi.string().valid("url", "m3u8", "rtmp", "iframe").default("url"),
    source_headers: Joi.object().default({}),
  }),

  updateMatch: Joi.object({
    title: Joi.string().max(500),
    sport: Joi.string().max(100),
    league: Joi.string().max(255).allow(""),
    home_team: Joi.string().max(255).allow(""),
    away_team: Joi.string().max(255).allow(""),
    status: Joi.string().valid("scheduled", "live", "finished", "cancelled"),
    start_time: Joi.date().iso().allow(null),
    metadata: Joi.object(),
  }),
};
