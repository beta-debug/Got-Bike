module.exports = async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, to, messages } = req.body;

        if (!token || !to || !messages) {
            return res.status(400).json({ error: 'Missing required fields: token, to, messages' });
        }

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ to, messages })
        });

        const data = await response.text();

        if (response.ok) {
            return res.status(200).json({ success: true });
        } else {
            let errorData;
            try {
                errorData = JSON.parse(data);
            } catch (e) {
                errorData = { message: data };
            }
            return res.status(response.status).json({
                success: false,
                error: errorData.message || JSON.stringify(errorData)
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
};
