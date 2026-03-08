const fs = require('fs');
const file = 'src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `      setIsListening(true);
      toast.info("Recording... Tap stop when done.", { icon: "🎙️", duration: 3000 });

    } catch (err: any) {
      console.error("Mic access error:", err);
      if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
        toast.error("Microphone permission denied. Please allow access in your browser settings.");
      } else if (err.name === 'NotFoundError') {
        toast.error("No microphone found on this device.");
      } else {
        toast.error("Could not access microphone.");
      }
      setIsListening(false);
    }`;

const newStr = `      setIsListening(true);
      toast.info("Recording... Tap stop when done.", { icon: "🎙️", duration: 3000 });

    } catch (err: any) {
      console.error("Mic access error:", err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        toast.error("Microphone permission denied. Please allow access in your browser settings.");
      } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
        toast.error("No microphone found on this device.");
      } else {
        toast.error("Could not access microphone.");
      }
      setIsListening(false);
    }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync(file, content, 'utf8');
