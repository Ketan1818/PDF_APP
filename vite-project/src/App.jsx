import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'
function App() {
    const [file, setFile] = useState(null);
    const [pdfRecords, setPdfRecords] = useState([]);
    const [pdfUrl, setPdfUrl] = useState(null);

    useEffect(() => {
        fetchPdfRecords();
    }, []);

    const fetchPdfRecords = async () => {
        try {
            const response = await axios.get('http://localhost:5000/pdfrecords');
            setPdfRecords(response.data);
        } catch (error) {
            console.error('Error fetching PDF records:', error);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('pdfFile', file);

        try {
            await axios.post('http://localhost:5000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('File uploaded successfully');
            fetchPdfRecords();
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const handleDownload = async (id) => {
        try {
            const response = await axios.get(`http://localhost:5000/download/${id}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'file.pdf');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handleView = async (id) => {
        try {
            const response = await axios.get(`http://localhost:5000/view/${id}`, {
                responseType: 'arraybuffer',
            });
    
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank'); 
        } catch (error) {
            console.error('Error viewing file:', error);
        }
    };


    const handleUpdate = async (id) => {
     
        const input = document.createElement('input');
        input.type = 'file';

        input.addEventListener('change', async () => {
         
            if (input.files && input.files.length > 0) {
                const newFile = input.files[0]; 
    
                const formData = new FormData();
                formData.append('pdfFile', newFile);
    
                try {
                    await axios.put(`http://localhost:5000/update/${id}`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    console.log('File updated successfully');
                    fetchPdfRecords(); 
                } catch (error) {
                    console.error('Error updating file:', error);
                }
            }
        });
    
     
        input.click();
    };
    

    return (
        <>
            <div className='container'>
                <div className='main'>
                    <input type="file" onChange={handleFileChange} className='files' />
                    <button onClick={handleUpload} className='btn1'>Upload</button>
                </div>
            </div>
            <div className='pdf-records'>
                <h2>PDF Records</h2>
                <ul>
                    {pdfRecords.map((record) => (
                        <li key={record._id}>
                            <span>{record.filename}</span><br />
                            <span>Singned time : {record.signed}</span><br />
                            <span>Created time : {record.createdAt}</span><br />
                            <span>Modified time : {record.modifiedAt}</span><br />
                            <button onClick={() => handleDownload(record._id) }className='btn1'>Download</button>
                            <button onClick={() => handleView(record._id)}className='btn1'>View</button>
                            <button onClick={() => handleUpdate(record._id)}className='btn1'>Update</button>
                            {pdfUrl && pdfUrl === `http://localhost:5000/view/${record._id}` && (
                                <div>
                                    <iframe src={pdfUrl} width="100%" height="600px" title="PDF Viewer"></iframe>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

export default App;
