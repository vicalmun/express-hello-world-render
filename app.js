const express = require("express");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');

dotenv.config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const secretKey = process.env.SECRET_KEY;

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3001;

app.get("/", (req, res) => res.type('html').send(html));

async function getOpenAIResponse() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Dame una idea de negocio plausible para una persona. Escribeme solo la idea, no nesito una introducción" }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 100,
      top_p: 1,
    });

    return completion.choices[0];
  } catch (err) {
    console.error('Error al obtener la respuesta de OpenAI:', err);
    throw err;
  }
}

async function getLongOpenAIResponse(idea) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: `Desarrollame la siguiente idea de negocio de forma simple: ${idea}` }],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 500,
      top_p: 1,
    });

    return completion.choices[0];
  } catch (err) {
    console.error('Error al obtener la respuesta de OpenAI:', err);
    throw err;
  }
}


function getUserByUsername(username) {
  if (username === 'victor') {
    return {
      id: 1,
      username: 'victor',
      password: 'alba',
    };
  }

  return null;
}

// ! una función cutre para recuperar el token de la cabecera

function authenticateToken(req, res, next) {
  const { authorization } = req.headers;

  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7, authorization.length);
    try {
      const decodedToken = jwt.verify(token, secretKey);
      req.user = decodedToken;
      next();
    } catch (err) {
      res.status(401).send({ message: 'Token inválido' });
    }
  } else {
    res.status(401).send({ message: 'Token no provisto' });
  }
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await getUserByUsername(username);

    if (user && bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
      res.send({ message: 'Autenticación exitosa', token });
    } else {
      res.status(401).send({ message: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error en el servidor' });
  }
});

// ? se supone que es un middleware, pero no va xd
// app.use('/api', expressJwt({ secret: secretKey, algorithms: ['HS256'] }));


app.get('/api/new-idea', authenticateToken, async (req, res) => {
  try {
    const response = await getOpenAIResponse();
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la respuesta de OpenAI' });
  }
});


app.get('/api/long-idea', authenticateToken, async (req, res) => {
  const { idea } = req.query;

  try {
    const response = await getLongOpenAIResponse(encodeURIComponent(idea));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la respuesta de OpenAI' });
  }
});


const server = app.listen(port, () => console.log(`Corriendo servidor en el puerto: ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
