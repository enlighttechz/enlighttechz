const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});

const chatLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 chat messages per hour
    message: { success: false, message: 'Chat limit reached. Please try again in an hour.' }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('./'));
app.use('/api/', generalLimiter); // Apply general limit to all API routes
app.use('/api/chat', chatLimiter); // Apply stricter limit to chat specifically

// MongoDB Connection
// IMPORTANT: Ensure you have replaced 'password' with your actual MongoDB Atlas password in the .env file.
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enlighttechz';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
}).then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
        if (err.message.includes('ENOTFOUND')) {
            console.error('Tip: This DNS error usually means your network is blocking MongoDB SRV records. Try using a different DNS (like 8.8.8.8) or use the non-srv connection string.');
        }
    });

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    service: String,
    message: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// Career Schema
const careerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    position: String,
    type: String, // Job or Internship
    message: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});

const Career = mongoose.model('Career', careerSchema);

// Service Schema
const serviceSchema = new mongoose.Schema({
    title: String,
    description: String,
    icon: String,
    link: String
});
const Service = mongoose.model('Service', serviceSchema);

// Package Schema
const packageSchema = new mongoose.Schema({
    category: String,
    name: String,
    price: String,
    features: [String],
    isPremium: { type: Boolean, default: false },
    link: String
});
const Package = mongoose.model('Package', packageSchema);

// Chat Schema
const chatSchema = new mongoose.Schema({
    sessionId: String,
    messages: [
        {
            role: String, // 'user' or 'bot'
            content: String,
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

const Chat = mongoose.model('Chat', chatSchema);

// Google Gemini AI Configuration
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction to restrict the chatbot
const systemInstruction = `
You are the official AI Sales Executive for Enlight Techz, a premium IT solutions company.
Your goal is to drive sales, capture leads, and provide expert information about our core IT services.

CORE RULES:
1. ONLY provide support and information related to Enlight Techz services.
2. If a user asks a question unrelated to Enlight Techz, politely decline and steer the conversation back to our IT solutions.
3. Be professional, persuasive, and maintain the brand's premium tone as a knowledgeable Sales Executive.
4. Encourage users to use the contact form or email (enlighttechz@gmail.com) for specific project quotes.

COMPANY DETAILS:
- Name: Enlight Techz
- Location: Karaikal, Puducherry.
- Email: enlighttechz@gmail.com
- Core Services: Web Development, Mobile App Development, Software Development, SEO, AEO & GEO (Search Engine, AI Engine & Generative Engine Optimization), CRM Solutions, and AI Agent Development.
- Industries Served: Finance, Healthcare, Education, E-commerce, Manufacturing, Logistics.
- Support: 24/7 technical support via phone, email, and remote assistance.
- Process: Consultation -> Customized Quote -> Solution Implementation.

Always represent Enlight Techz as a high-performance, innovative, and reliable technology partner.
5. IMPORTANT: Always format key terms, section headers, and important information using double asterisks (e.g., **Key Term**) for bolding in your responses.
6. DO NOT use single asterisks (*) for lists or emphasis. For lists, use bullet points (•) and ensure each item starts on a new line.
`;

const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction: systemInstruction 
});

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
//health
app.get('/api/health', (req, res) => {
    res.json({
        'Status': 'Server running'
    })
})

// API Route for Chat
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection is not ready. Please try again in a few seconds.' 
        });
    }

    try {
        // 1. Fetch History from MongoDB
        let chat = await Chat.findOne({ sessionId });
        if (!chat) {
            chat = new Chat({ sessionId, messages: [] });
        }

        // 2. Prepare History for Gemini (Optional but improves context)
        // Gemini expects [{role: 'user', parts: [{text: '...'}]}, {role: 'model', parts: [{text: '...'}]}]
        const history = chat.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // 3. Generate Response from Gemini using Chat Session
        const chatSession = model.startChat({
            history: history,
        });

        const result = await chatSession.sendMessage(message);
        const botResponse = result.response.text();

        // 4. Save to MongoDB
        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({ role: 'bot', content: botResponse });
        await chat.save();

        res.status(200).json({ success: true, response: botResponse });
    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ success: false, message: 'I am having trouble thinking right now. Please try again later.' });
    }
});

// API Route for Contact Form
app.post('/api/contact', async (req, res) => {
    const { name, email, service, message } = req.body;

    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Database is not ready. Please try again later.' });
    }

    try {
        // 1. Save to MongoDB
        const newContact = new Contact({ name, email, service, message });
        await newContact.save();

        // 2. Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'enlighttechz@gmail.com',
            subject: `New Contact Request: ${service}`,
            text: `Name: ${name}\nEmail: ${email}\nService: ${service}\nMessage: ${message}`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Data saved and email sent!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// API Route for Career Applications
app.post('/api/career', async (req, res) => {
    const { name, email, phone, position, type, message } = req.body;

    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Database is not ready. Please try again later.' });
    }

    try {
        // 1. Save to MongoDB
        const newApplication = new Career({ name, email, phone, position, type, message });
        await newApplication.save();

        // 2. Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'enlighttechz@gmail.com',
            subject: `New Career Application: ${position} (${type})`,
            text: `
                Name: ${name}
                Email: ${email}
                Phone: ${phone}
                Position: ${position}
                Type: ${type}
                Message: ${message}
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Application submitted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ================= ADMIN API ROUTES =================

// Contacts (Orders/Inquiries)
app.get('/api/admin/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ date: -1 });
        res.json(contacts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/contacts/:id', async (req, res) => {
    try {
        await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Careers (Internships/Jobs)
app.get('/api/admin/careers', async (req, res) => {
    try {
        const careers = await Career.find().sort({ date: -1 });
        res.json(careers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/careers/:id', async (req, res) => {
    try {
        await Career.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Services
app.get('/api/admin/services', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/admin/services', async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();
        res.json(service);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/services/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(service);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Packages
app.get('/api/admin/packages', async (req, res) => {
    try {
        const packages = await Package.find();
        res.json(packages);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/admin/packages', async (req, res) => {
    try {
        const pkg = new Package(req.body);
        await pkg.save();
        res.json(pkg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/packages/:id', async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(pkg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/packages/:id', async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
