# Heroku Authenticated HTTP Proxy

Simple **Basic Auth** protected HTTP proxy designed to bypass campus network restrictions.

### Deploy to Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/IT25101377/Proxy)

### Default Credentials
- **Username**: `sliit`
- **Password**: `sliit`

You can change them after deployment in Heroku → Settings → Config Vars.

### How to use in Chrome Extension
- **Proxy Type**: HTTP
- **Host**: `your-app-name.herokuapp.com` (or your custom domain `pr.kaveeshainduwara.lk`)
- **Port**: `443`
- **Authentication**: Enable "Proxy requires authentication" → use the username and password above.

**Note**: You cannot use port 3128 on Heroku. All traffic goes through HTTPS on port 443.

---

Now push all files (`app.json`, updated `server.js`, `package.json`, `Procfile`, etc.) to your GitHub repo.

Then try the **Deploy to Heroku** button again — it should work now.

Would you like me to also add domain configuration instructions for `pr.kaveeshainduwara.lk`?
