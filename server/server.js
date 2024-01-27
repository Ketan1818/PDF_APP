
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/PDF_COLLECTION')
    .then(() => console.log('DB successfully connected'))
    .catch((err) => console.log('Error in DB connection'));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const PdfRecordSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PdfRecord = mongoose.model('PdfRecord', PdfRecordSchema);

app.post('/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        const { originalname, filename } = req.file;
        const filePath = path.join('uploads', filename);
        const pdfRecord = new PdfRecord({ filename: originalname, filePath: filePath });
        await pdfRecord.save();
        res.send('File uploaded successfully');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/download/:id', async (req, res) => {
    try {
        const pdfRecord = await PdfRecord.findById(req.params.id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }
        const filePath = path.join(__dirname, pdfRecord.filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfRecord.filename}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/view/:id', async (req, res) => {
    try {
        const pdfRecord = await PdfRecord.findById(req.params.id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }
        const filePath = path.join(__dirname, pdfRecord.filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error viewing file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/add-signature/:id', async (req, res) => {
    try {
        const pdfRecord = await PdfRecord.findById(req.params.id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }

        const existingPdfBytes = fs.readFileSync(path.join(__dirname, pdfRecord.filePath));
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const [page] = pdfDoc.getPages();
        const { signatureData } = req.body;

        signatureData.forEach(({ color, curve }) => {
            page.getOperatorList()
                .addOp({
                    opcode: 'SAVE',
                    operands: [],
                })
                .addOp({
                    opcode: 'GRESTORE',
                    operands: [],
                })
                .addOp({
                    opcode: 'G',
                    operands: [color.r, color.g, color.b],
                })
                .addOp({
                    opcode: 'w',
                    operands: [2],
                });
            page.getOperatorList().addOp({
                opcode: 'm',
                operands: [curve[0].x, curve[0].y],
            });
            curve.slice(1).forEach((point) => {
                page.getOperatorList().addOp({
                    opcode: 'l',
                    operands: [point.x, point.y],
                });
            });
            page.getOperatorList().addOp({
                opcode: 'S',
                operands: [],
            });
        });

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(path.join(__dirname, pdfRecord.filePath), modifiedPdfBytes);

        res.send('Signature added successfully');
    } catch (error) {
        console.error('Error adding signature:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/pdfrecords', async (req, res) => {
    try {
        const pdfRecords = await PdfRecord.find();
        res.json(pdfRecords);
    } catch (error) {
        console.error('Error fetching PDF records:', error);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
