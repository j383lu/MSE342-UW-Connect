[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=22136868)
# MSE 342 - Group Project: UW Connect


## Project Description:

UW Connect is a centralized social engagement platform specifically engineered for the University of Waterloo’s students and staff. By integrating campus activities into a single intuitive interface, the app streamlines how the UW community interacts with eachother.

The platform serves as a digital hub for students to find each other and connect for intramurals, study groups, and event management, fostering a more cohesive campus culture. Through real-time posts and centralized engagement tools, UW bridges the gap between academic and extracurriculars. In turn, it helps students meet each other; post their thoughts and opinions; and bring the community together. 

## Additional Information:



## Development Tips:
- Use CodeSpaces for this project.
- In VSCode terminal on CodeSpaces start a new branch:
```git checkout -b your-branch-name```
- As you code, push daily changes to your GitHub repo's `d2` branch:
```
git add .
git commit -m "done feature xyz"
git push origin your-branch-name
```


### Setting up access to the database from Codespaces

Watch the video on how to set up connection to the database from Codespaces: https://vimeo.com/974744158/db6098a69b?share=copy

Follow the instructions and ensure that you are able to connect to the database from Codespaces.
   
Steps:

   1. Download the Private Key file `student_ed25519` from Learn (located under Contents > General lab resources) to your own computer. 
   
   2. Open GitHub in the browser. Go to Settings > Codespaces. Click on `New Secret` button. Type the word `STUDENT` in the `Name` field, and paste the content of the Private Key file in the `Value` field. In the `Repository Access` drop-down menu, select the name of your Lab 9 repository. Click `Add Secret` button. 
   
   3. Start CodeSpaces. In the Terminal on Codespaces, copy and paste the following:

   ```
   echo "${STUDENT}"
   ```
   
   If your setup has been correct so far, this will print the content of your private key to the terminal. Verify that it is displayed.

   4. Next, copy and paste the following:

   ```
   eval `ssh-agent`
   ```

   You should see the response like this: `Agent pid 28558`

   5. Next, copy and paste the following:

   ```
   ssh-add - <<< "${STUDENT}"
   ```

   You should see the following response: `Identity added: (stdin) (student@mse-msci-245)`


   6. Next, copy and paste the following. Make sure that you change `<your-user-name>` to your actual UW username (without the angle brackets). 
   
   ```
	ssh -o ServerAliveInterval=30 -L 3306:localhost:3306 <your-user-name>@mse-msci-245.uwaterloo.ca
   ```

   You should see the prompt change to a line like this:

   ![image](/img/Lab9-img1.png)

   This means that you have successfully logged in to the remote server hosting the database. 
   
   Important: Do not close this terminal window!

   7. Start a new terminal in Codespaces by clicking on the following icon in the top-right corner of the terminal:
![image](/img/Lab9-img2.png)
   8. In the second terminal, type `yarn dev` to start the app on port 3000.

   9. In the root project directory, edit `config.js`, by adding your UW username on Lines 3 and on line 6. This will let you access the MySQL database named as `<your-username>` from NodeJS.
       


### Installing and initializing MySQL Workbench.

Watch the video on how to install and set up MySQL Workbench on your own computer: https://vimeo.com/974744257/e755329bf8?share=copy. 

Follow the instructions and ensure that you are able to connect to the database from MySQL Workbench.

#### Steps:

1. Install MySQL Workbench from https://www.mysql.com/products/workbench/

2. Open MySQL Workbench:

   Launch MySQL Workbench on your local machine.

3. Create a New Connection:

Click on the + icon next to MySQL Connections to create a new connection.

4. Configure Connection Settings:

Connection Name: `Remote MySQL via SSH`.
Connection Method: `Standard TCP/IP over SSH`.
Configure SSH Settings:

SSH Hostname: `mse-msci-245.uwaterloo.ca`
SSH Username: `your username`
SSH Key File: Path to your Private Key File, e.g., `/Users/yourusername/.ssh/student_ed25519` (Mac/Linux) or `C:\Users\yourusername\.ssh\student_ed25519` (Windows).
SSH Password: Leave this blank.

5. Configure MySQL Settings:

MySQL Hostname: `localhost`
MySQL Server Port: `3306`
Username: `your username`
Password: `MSE245-student`

6. Test Connection:

Click the Test Connection button to verify that the connection is working. You should see a success message if everything is configured correctly.

7. Save Connection:

Click OK to save the connection.

8. Final Steps

After setting up and saving the connection, you can double-click the connection in the MySQL Connections list to connect to your remote MySQL server via SSH.

### General tips:

Push changes to GitHub frequently:

```
git add .
git commit -m "feature completed"
git push origin your-branch-name
```

In your GitHub repo, create new pull request and merge `your-branch-name` branch with the `main` branch.
