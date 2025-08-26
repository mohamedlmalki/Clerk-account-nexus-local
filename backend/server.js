// backend/server.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;
const ACCOUNTS_FILE_PATH = path.join(__dirname, 'accounts.json');

// Middleware
app.use(cors());
app.use(express.json());

// --- Helper Functions ---
const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE_PATH, 'utf-8');
    if (data.trim() === '') {
        return []; // Handle empty file
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // File doesn't exist, return empty array
    }
    console.error("Error reading or parsing accounts.json:", error);
    return [];
  }
};

const writeAccounts = async (data) => {
  await fs.writeFile(ACCOUNTS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

const getSecretKey = async (accountId) => {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) throw new Error('Account not found');
    return account.secretKey;
};

// --- API Endpoints ---

// GET /api/accounts - Fetch all accounts (without secret keys)
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await readAccounts();
    const accountsForFrontend = accounts.map(({ secretKey, ...rest }) => rest);
    res.json(accountsForFrontend);
  } catch (error) {
    console.error("Error in /api/accounts:", error);
    res.status(500).json({ message: 'Error reading accounts file' });
  }
});

// POST /api/accounts - Add a new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, apiKey, secretKey } = req.body;
    if (!name || !apiKey || !secretKey) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const accounts = await readAccounts();
    const newAccount = {
      id: crypto.randomUUID(),
      name,
      apiKey,
      secretKey,
      isActive: accounts.length === 0,
    };

    if (newAccount.isActive) {
        accounts.forEach(acc => acc.isActive = false);
    }
    
    accounts.push(newAccount);
    await writeAccounts(accounts);
    
    const { secretKey: removed, ...safeAccount } = newAccount;
    res.status(201).json(safeAccount);

  } catch (error) {
    console.error("Error in /api/accounts POST:", error);
    res.status(500).json({ message: 'Error saving new account' });
  }
});

// DELETE /api/accounts/:id - Delete an account
app.delete('/api/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let accounts = await readAccounts();
        const initialLength = accounts.length;
        const deletedAccountWasActive = accounts.find(acc => acc.id === id)?.isActive;

        accounts = accounts.filter(acc => acc.id !== id);

        if (accounts.length === initialLength) {
            return res.status(404).json({ message: 'Account not found' });
        }
        
        if (deletedAccountWasActive && accounts.length > 0) {
            accounts[0].isActive = true;
        }

        await writeAccounts(accounts);
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error("Error in /api/accounts/:id DELETE:", error);
        res.status(500).json({ message: 'Error deleting account' });
    }
});

// POST /api/accounts/set-active - Switch the active account
app.post('/api/accounts/set-active', async (req, res) => {
    try {
        const { id } = req.body;
        let accounts = await readAccounts();
        accounts = accounts.map(acc => ({ ...acc, isActive: acc.id === id }));
        await writeAccounts(accounts);
        res.status(200).json({ message: 'Active account updated' });
    } catch (error) {
        console.error("Error in /api/accounts/set-active:", error);
        res.status(500).json({ message: 'Error updating active account' });
    }
});

// POST /api/accounts/test-connection-by-id - Test connection for a stored account
app.post('/api/accounts/test-connection-by-id', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Account ID is required' });
    }

    let secretKey;
    try {
        secretKey = await getSecretKey(id);
    } catch (error) {
        console.error("Error getting secret key for ID:", id, error.message);
        return res.status(404).json({ message: `Account with ID ${id} not found on the server.` });
    }

    try {
        // CORRECTED: Using a valid Clerk API endpoint to test the connection.
        const response = await fetch('https://api.clerk.com/v1/users?limit=1&get_total_count=true', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });

        const responseText = await response.text();
        
        try {
            const jsonResponse = JSON.parse(responseText);
            res.status(response.status).json(jsonResponse);
        } catch (jsonError) {
            console.error("Clerk API did not return valid JSON. This often means the API key is invalid.");
            console.log('--- Clerk API Raw Response ---');
            console.log('Status:', response.status, response.statusText);
            console.log('Body:', responseText);
            console.log('-----------------------------');
            
            res.status(response.status).json({
                error: true,
                message: "Clerk API did not return valid JSON, which likely means the Secret Key is invalid.",
                clerk_response_status: response.status,
                clerk_response_body: responseText
            });
        }
    } catch (fetchError) {
        console.error("Error fetching from Clerk API:", fetchError);
        res.status(500).json({ message: 'Server error: Could not connect to Clerk API.' });
    }
});

// ... (The rest of your endpoints for users and templates are fine)

app.post('/api/import-user', async (req, res) => {
    const { user, accountId, sendInvites } = req.body;
    if (!user || !accountId) {
        return res.status(400).json({ message: 'User data and accountId are required' });
    }

    try {
        const secretKey = await getSecretKey(accountId);

        let endpoint = '';
        let payload = {};

        if (sendInvites) {
            endpoint = 'https://api.clerk.com/v1/invitations';
            payload = {
                email_address: user.email,
                public_metadata: { "first_name": user.firstName || '', "last_name": user.lastName || '' },
                ignore_existing: true
            };
        } else {
            endpoint = 'https://api.clerk.com/v1/users';
            payload = {
                email_address: [user.email],
                first_name: user.firstName,
                last_name: user.lastName,
                password: user.password,
                skip_password_checks: false,
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok) {
            res.status(200).json({
                email: user.email, status: 'success',
                message: sendInvites ? `Invitation sent` : `User created`,
                userId: data.id || (data.user ? data.user.id : null)
            });
        } else {
            const errorMessage = data.errors?.[0]?.long_message || 'An API error occurred.';
            res.status(400).json({ email: user.email, status: 'error', message: errorMessage });
        }
    } catch (error) {
        if (error.message === 'Account not found') {
           return res.status(404).json({ email: user.email, status: 'error', message: 'Account not found.' });
        }
        res.status(500).json({ email: user.email, status: 'error', message: 'Failed to connect to the Clerk API.' });
    }
});

app.get('/api/users/:accountId', async (req, res) => {
    const { accountId } = req.params;
    if (!accountId) {
        return res.status(400).json({ message: 'accountId is required' });
    }
    
    try {
        const secretKey = await getSecretKey(accountId);
        const response = await fetch('https://api.clerk.com/v1/users?limit=500', {
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });
        
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);
    } catch (error) {
        if (error.message === 'Account not found') {
            return res.status(404).json({ message: 'Account not found' });
        }
        res.status(500).json({ message: 'Failed to connect to Clerk API.' });
    }
});


app.delete('/api/users/:accountId/:userId', async (req, res) => {
    const { accountId, userId } = req.params;

    if (!accountId || !userId) {
        return res.status(400).json({ message: 'Account ID and User ID are required' });
    }

    try {
        const secretKey = await getSecretKey(accountId);
        const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });

        if (response.ok) {
            const data = await response.json();
            res.status(200).json({
                status: 'success',
                message: `User ${data.id} deleted.`,
                deletedUser: data,
            });
        } else {
            const errorData = await response.json();
            res.status(response.status).json({
                status: 'error',
                message: errorData.errors?.[0]?.long_message || 'Failed to delete user.',
            });
        }
    } catch (error) {
         if (error.message === 'Account not found') {
            return res.status(404).json({ status: 'error', message: 'Account not found' });
        }
        res.status(500).json({ status: 'error', message: 'Server error during deletion.' });
    }
});

app.get('/api/templates/:accountId/:template_type', async (req, res) => {
    const { accountId, template_type } = req.params;
    try {
        const secretKey = await getSecretKey(accountId);
        const response = await fetch(`https://api.clerk.com/v1/templates/${template_type}`, {
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/templates/:accountId/:template_type/:slug', async (req, res) => {
    const { accountId, template_type, slug } = req.params;
    try {
        const secretKey = await getSecretKey(accountId);
        const response = await fetch(`https://api.clerk.com/v1/templates/${template_type}/${slug}`, {
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/templates/:accountId/:template_type/:slug', async (req, res) => {
    const { accountId, template_type, slug } = req.params;
    try {
        const secretKey = await getSecretKey(accountId);
        
        const payload = req.body;
        if (payload.body) {
            payload.markup = payload.body;
        }

        const response = await fetch(`https://api.clerk.com/v1/templates/${template_type}/${slug}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/templates/:accountId/:template_type/:slug/revert', async (req, res) => {
    const { accountId, template_type, slug } = req.params;
    try {
        const secretKey = await getSecretKey(accountId);
        const response = await fetch(`https://api.clerk.com/v1/templates/${template_type}/${slug}/revert`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${secretKey}` },
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});