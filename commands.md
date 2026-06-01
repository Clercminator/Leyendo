#COMMANDS
git switch Preview   # move to Preview
git switch main      # move to main

#To merge Preview into main and deploy Production:
git switch main
git pull origin main
git merge Preview
git push origin main